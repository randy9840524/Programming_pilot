import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { promises as fs } from 'fs';
import path from 'path';
import { artifacts, projects, insertProjectSchema, files, artifactVersions } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import fetch from "node-fetch";

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

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

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

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

      const [project] = await db.insert(projects).values(result.data).returning();
      res.json(project);
    } catch (error) {
      console.error("Failed to create project:", error);
      res.status(500).json({ message: "Failed to create project" });
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

  // AI Analysis endpoint with enhanced file handling
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      const { prompt, files: uploadedFiles } = req.body;
      console.log("Received analyze request:", { prompt, filesCount: uploadedFiles?.length });

      if (!process.env.OPENAI_API_KEY) {
        console.error("OpenAI API key not configured");
        return res.status(500).json({ message: "OpenAI API key not configured" });
      }

      const messages: any[] = [
        {
          role: "system" as const,
          content: `You are an expert UI designer and developer. Analyze the uploaded content and provide HTML/CSS code to replicate the design. Focus on:
1. Accurate visual representation
2. Responsive layout
3. Modern CSS practices
4. Accessibility
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
          try {
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
          } catch (error) {
            console.error("Error reading image file:", error);
            messages.push({
              role: "user" as const,
              content: prompt || "Please provide a default implementation"
            });
          }
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
        console.error("No response from OpenAI");
        throw new Error("Failed to get response from AI");
      }

      console.log("Successfully got response from OpenAI");
      res.json({ response });

    } catch (error: any) {
      console.error("AI Analysis failed:", error);
      res.status(500).json({
        message: error.message || "Failed to get AI response"
      });
    }
  });

  // Preview endpoint
  app.post("/api/preview", async (req: Request, res: Response) => {
    try {
      const { response } = req.body;

      // If no response provided, get one from the AI
      if (!response) {
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

        const data = await analyzeResponse.json();
        if (typeof data.response !== 'string') {
          throw new Error('Invalid response format from analyze endpoint');
        }
        res.json({ preview: data.response });
      } else {
        if (typeof response !== 'string') {
          throw new Error('Invalid response format');
        }
        res.json({ preview: response });
      }
    } catch (error: any) {
      console.error("Preview generation failed:", error);
      res.status(500).json({ message: error.message || "Failed to generate preview" });
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