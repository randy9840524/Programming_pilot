import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { promises as fs } from 'fs';
import path from 'path';
import { artifacts, projects, insertProjectSchema, files, artifactVersions } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Get project by ID
  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).send("Invalid project ID");
      }

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!project) {
        return res.status(404).send("Project not found");
      }

      res.json(project);
    } catch (error) {
      console.error("Failed to fetch project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Get all projects
  app.get("/api/projects", async (_req: Request, res: Response) => {
    try {
      const allProjects = await db.select().from(projects);
      res.json(allProjects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Create new project
  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const result = insertProjectSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(result.error.issues.map(i => i.message).join(", "));
      }

      // Extract only the fields we want to insert
      const { name, description, language, framework } = result.data;
      const projectData = {
        name,
        description,
        language,
        framework,
      };

      const [project] = await db
        .insert(projects)
        .values(projectData)
        .returning();

      res.json(project);
    } catch (error) {
      console.error("Failed to create project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Get all artifacts for a project
  app.get("/api/artifacts", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.query.projectId as string);
      if (isNaN(projectId)) {
        return res.status(400).send("Project ID is required");
      }

      const projectArtifacts = await db
        .select()
        .from(artifacts)
        .where(eq(artifacts.projectId, projectId));

      res.json(projectArtifacts);
    } catch (error) {
      console.error("Failed to fetch artifacts:", error);
      res.status(500).json({ message: "Failed to fetch artifacts" });
    }
  });

  // Get artifact versions
  app.get("/api/artifacts/:id/versions", async (req: Request, res: Response) => {
    try {
      const artifactId = parseInt(req.params.id);
      if (isNaN(artifactId)) {
        return res.status(400).send("Invalid artifact ID");
      }

      const versions = await db
        .select()
        .from(artifactVersions)
        .where(eq(artifactVersions.artifactId, artifactId))
        .orderBy(artifactVersions.version);

      res.json(versions);
    } catch (error) {
      console.error("Failed to fetch artifact versions:", error);
      res.status(500).json({ message: "Failed to fetch versions" });
    }
  });

  // Create new artifact
  app.post("/api/artifacts", async (req: Request, res: Response) => {
    try {
      const { title, description, content, contentType, projectId } = req.body;

      if (!title || !content || !contentType || !projectId) {
        return res.status(400).send("Missing required fields");
      }

      const [artifact] = await db
        .insert(artifacts)
        .values({
          title,
          description,
          content,
          contentType,
          projectId,
          version: 1,
        })
        .returning();

      // Create initial version
      await db.insert(artifactVersions).values({
        artifactId: artifact.id,
        version: 1,
        content,
        description: "Initial version",
        metadata: { editType: "full" },
      });

      res.json(artifact);
    } catch (error) {
      console.error("Failed to create artifact:", error);
      res.status(500).json({ message: "Failed to create artifact" });
    }
  });

  // Update artifact
  app.put("/api/artifacts/:id", async (req: Request, res: Response) => {
    try {
      const artifactId = parseInt(req.params.id);
      const { content, description } = req.body;

      if (isNaN(artifactId)) {
        return res.status(400).send("Invalid artifact ID");
      }

      // Get current artifact
      const [currentArtifact] = await db
        .select()
        .from(artifacts)
        .where(eq(artifacts.id, artifactId))
        .limit(1);

      if (!currentArtifact) {
        return res.status(404).send("Artifact not found");
      }

      // Create new version
      const newVersion = currentArtifact.version + 1;
      await db.insert(artifactVersions).values({
        artifactId,
        version: newVersion,
        content,
        description,
        metadata: { editType: "full" },
      });

      // Update artifact
      const [updatedArtifact] = await db
        .update(artifacts)
        .set({
          content,
          version: newVersion,
          updatedAt: new Date(),
        })
        .where(eq(artifacts.id, artifactId))
        .returning();

      res.json(updatedArtifact);
    } catch (error) {
      console.error("Failed to update artifact:", error);
      res.status(500).json({ message: "Failed to update artifact" });
    }
  });


  // Get project files
  app.get("/api/projects/:id/files", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const projectFiles = await db
        .select()
        .from(files)
        .where(eq(files.projectId, projectId));
      res.json(projectFiles);
    } catch (error) {
      console.error("Failed to fetch project files:", error);
      res.status(500).json({ message: "Failed to fetch project files" });
    }
  });

  // AI Analysis endpoint
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      const { prompt, files: uploadedFiles } = req.body;
      console.log("Received analyze request:", { prompt, filesCount: uploadedFiles?.length });

      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key not configured");
      }

      const messages: any[] = [
        {
          role: "system" as const,
          content: `You are an expert UI designer and developer. Analyze the uploaded content and provide HTML/CSS code to replicate the design. Focus on:
2. Accurate visual representation
3. Responsive layout
4. Modern CSS practices
5. Accessibility
Output complete, self-contained HTML with embedded CSS that can be directly previewed.`
        }
      ];

      // Add uploaded files to the message
      if (uploadedFiles && uploadedFiles.length > 0) {
        const fileContents = uploadedFiles.map((file: any) => ({
          type: file.type.startsWith('image/') ? 'image_url' : 'text',
          [file.type.startsWith('image/') ? 'image_url' : 'text']:
            file.type.startsWith('image/') ?
              { url: `data:${file.type};base64,${file.data}` } :
              file.data
        }));

        messages.push({
          role: "user" as const,
          content: [
            { type: "text", text: prompt || "Please analyze this content and create a pixel-perfect HTML/CSS implementation" },
            ...fileContents
          ]
        });
      } else {
        // Check for files in assets directory
        const assetsDir = path.join(process.cwd(), "attached_assets");
        const latestImage = await getLatestFile(assetsDir);
        console.log("Latest image found:", latestImage);

        if (latestImage) {
          const imageBuffer = await fs.readFile(latestImage);
          messages.push({
            role: "user" as const,
            content: [
              { type: "text", text: prompt || "Please analyze this image and create a pixel-perfect HTML/CSS implementation" },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${imageBuffer.toString('base64')}`
                }
              }
            ]
          });
        } else {
          messages.push({
            role: "user" as const,
            content: prompt || "Please provide a default implementation"
          });
        }
      }

      console.log("Sending request to OpenAI");
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 4000
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("Failed to get response from AI");
      }

      console.log("Successfully got response from OpenAI");
      res.json({ response });

    } catch (error: any) {
      console.error("AI Analysis failed:", error);
      res.status(500).json({
        message: error.message || "Failed to get AI response",
        error: error.toString()
      });
    }
  });

  // Preview endpoint
  app.post("/api/preview", async (req: Request, res: Response) => {
    try {
      const { response: aiResponse, originalImage } = req.body;

      // If no response provided, get one from the AI
      if (!aiResponse) {
        const analyzeResponse = await fetch(`${req.protocol}://${req.get('host')}/api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(req.body)
        });

        if (!analyzeResponse.ok) {
          throw new Error('Failed to analyze content');
        }

        const { response: analyzedContent } = await analyzeResponse.json();
        let htmlContent = analyzedContent;
        const htmlMatch = analyzedContent.match(/```html\n([\s\S]*?)```/);
        if (htmlMatch) {
          htmlContent = htmlMatch[1];
        }

        // Apply styling and structure
        htmlContent = wrapWithBookingStyle(htmlContent, originalImage);
        res.setHeader('Content-Type', 'text/html');
        return res.send(htmlContent);
      }

      // Handle direct response
      let htmlContent = aiResponse;
      const htmlMatch = aiResponse.match(/```html\n([\s\S]*?)```/);
      if (htmlMatch) {
        htmlContent = htmlMatch[1];
      }

      // Apply styling and structure
      htmlContent = wrapWithBookingStyle(htmlContent, originalImage);
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);

    } catch (error: any) {
      console.error("Preview generation failed:", error);
      res.status(500).json({ 
        message: error.message || "Failed to generate preview",
        error: error.toString()
      });
    }
  });

  // Export desktop application
  app.post("/api/export/desktop", async (_req: Request, res: Response) => {
    const tempDir = path.join(process.cwd(), 'temp_export');

    try {
      // Create the game HTML
      const gameHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Pong Game</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              min-height: 100vh;
              background: #000;
              display: flex;
              justify-content: center;
              align-items: center;
              font-family: system-ui, sans-serif;
              color: #fff;
            }
            canvas {
              background: #000;
              max-width: 100%;
              height: auto;
              border: 2px solid #333;
              box-shadow: 0 0 20px rgba(255,255,255,0.1);
            }
            .game-instructions {
              margin-top: 20px;
              font-size: 14px;
              color: #888;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div id="gameContainer">
            <canvas id="pongCanvas" width="800" height="400"></canvas>
            <div class="game-instructions">
              Use ↑ and ↓ keys to control the right paddle<br>
              Collect power-ups to gain advantages!
            </div>
          </div>
          <script>
            try {
              ${createPongGame()}
            } catch (error) {
              document.getElementById('gameContainer').innerHTML = 
                '<div style="color: red; padding: 20px;"><strong>Error:</strong><br>' + error.message + '</div>';
            }
          </script>
        </body>
        </html>
      `;

      // Create the desktop package
      await createDesktopPackage(tempDir, gameHTML);

      // Create and send the zip file
      const zipPath = await createZipArchive(tempDir);
      const zipFile = await fs.readFile(zipPath);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=pong-game.zip');
      res.send(zipFile);

    } catch (error) {
      console.error("Export failed:", error);
      res.status(500).json({ message: "Failed to export application" });
    } finally {
      // Clean up temporary directory
      await cleanupTempDir(tempDir);
    }
  });

  // Export web application
  app.post("/api/export/web", async (_req: Request, res: Response) => {
    try {
      res.json({ url: getWebDeploymentUrl() });
    } catch (error) {
      console.error("Web deployment failed:", error);
      res.status(500).json({ message: "Failed to deploy web application" });
    }
  });

  // Build status endpoint
  app.get("/api/build/status", (req: Request, res: Response) => {
    res.json({
      status: "complete",
      logs: ["Build completed successfully"],
    });
  });

  // Build endpoint
  app.post("/api/build", async (req: Request, res: Response) => {
    try {
      const { content, file } = req.body;

      if (!content || !file) {
        return res.status(400).json({
          message: "Missing content or file path"
        });
      }

      // Here you would typically trigger your build process
      // For now, we'll just simulate a successful build
      res.json({
        message: "Build started",
        buildId: Date.now().toString()
      });
    } catch (error) {
      console.error("Build failed:", error);
      res.status(500).json({
        message: "Failed to start build"
      });
    }
  });
  return httpServer;
}

// Helper function to wrap HTML content with Booking.com-inspired styling
function wrapWithBookingStyle(content: string, originalImage: any | null): string {
  // Add image embedding if there's an original image
  let processedContent = content;
  if (originalImage) {
    const imageTag = `<div class="property-image-container"><img src="data:${originalImage.type};base64,${originalImage.data}" alt="Property" class="property-image"></div>`;
    processedContent = processedContent.replace(/<img[^>]+>/g, imageTag);
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.5;
      color: #333;
      background-color: #f5f5f5;
    }

    .header {
      background: #003580;
      color: white;
      padding: 16px;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
    }

    .search-bar {
      background: #febb02;
      padding: 16px;
      margin: 64px 0 24px;
    }

    .search-bar form {
      max-width: 1160px;
      margin: 0 auto;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .search-bar input,
    .search-bar select {
      padding: 12px;
      border: none;
      border-radius: 4px;
      flex: 1;
      min-width: 200px;
      font-size: 14px;
    }

    .search-button {
      background: #0071c2;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 14px;
    }

    .search-button:hover {
      background: #005999;
    }

    .main-content {
      max-width: 1160px;
      margin: 0 auto;
      padding: 0 16px;
    }

    .property-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      margin: 24px 0;
    }

    .property-card {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      transition: transform 0.2s;
    }

    .property-card:hover {
      transform: translateY(-4px);
    }

    .property-image-container {
      position: relative;
      padding-top: 75%; /* 4:3 aspect ratio */
      overflow: hidden;
    }

    .property-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .property-info {
      padding: 16px;
    }

    .property-type {
      font-size: 16px;
      font-weight: 600;
      color: #262626;
      margin-bottom: 4px;
    }

    .property-description {
      font-size: 14px;
      color: #6b6b6b;
    }

    @media (max-width: 1200px) {
      .property-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 900px) {
      .property-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .property-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  ${processedContent}
</body>
</html>`;
}

// Helper function to get the latest file from a directory
async function getLatestFile(directory: string): Promise<string | null> {
  try {
    const files = await fs.readdir(directory);
    let latestFile: string | null = null;
    let latestTime = 0;

    for (const file of files) {
      if (file.endsWith('.png')) {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);
        if (stats.mtimeMs > latestTime) {
          latestTime = stats.mtimeMs;
          latestFile = filePath;
        }
      }
    }

    return latestFile;
  } catch (error) {
    console.error('Error reading directory:', error);
    return null;
  }
}

// Placeholder functions -  These need to be implemented separately.
function createPongGame(): string {
  //Implementation for Pong game creation
  throw new Error("Function not implemented.");
}

async function createDesktopPackage(tempDir: string, gameHTML: string): Promise<void> {
  //Implementation for creating desktop package
  throw new Error("Function not implemented.");
}

async function createZipArchive(tempDir: string): Promise<string> {
  //Implementation for creating zip archive
  throw new Error("Function not implemented.");
}

async function cleanupTempDir(tempDir: string): Promise<void> {
  //Implementation for cleaning up temporary directory
  throw new Error("Function not implemented.");
}

function getWebDeploymentUrl(): string {
  //Implementation for getting web deployment URL
  throw new Error("Function not implemented.");
}