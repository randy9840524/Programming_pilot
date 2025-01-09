import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';
import path from 'path';
import { artifacts, projects, insertProjectSchema, files, artifactVersions } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { createDesktopPackage, createZipArchive, cleanupTempDir, getWebDeploymentUrl } from './utils/export';
import { createPongGame } from '../client/src/lib/game/pong';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const execFileAsync = promisify(execFile);

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

async function getLatestFile(directory: string): Promise<string | null> {
  try {
    const dirFiles = await readdir(directory);
    let latestFile: string | null = null;
    let latestTime = 0;

    for (const file of dirFiles) {
      if (file.endsWith('.png')) {
        const filePath = path.join(directory, file);
        const fileStats = await stat(filePath);
        if (fileStats.mtimeMs > latestTime) {
          latestTime = fileStats.mtimeMs;
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
          content: `You are an expert software development assistant specializing in building web applications. 
You can see and analyze both code and images that users share.
When analyzing uploaded content:
1. First describe what you see in any images
2. Then provide specific, actionable guidance for implementation
3. Include complete code samples when relevant
4. Always acknowledge uploaded files in your response

Remember to:
- Be specific about UI elements and layout
- Provide complete code snippets that can be directly used
- Reference visual elements from uploaded images in your explanations`
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
            { type: "text", text: prompt || "Please analyze these files" },
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
            const imageBuffer = await fs.promises.readFile(latestImage);
            messages.push({
              role: "user" as const,
              content: [
                { type: "text", text: prompt },
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
              content: prompt
            });
          }
        } else {
          messages.push({
            role: "user" as const,
            content: prompt
          });
        }
      }

      console.log("Sending request to OpenAI");
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 3000
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

  // Preview endpoint with Login portal
  app.post("/api/preview", async (_req: Request, res: Response) => {
    try {
      const preview = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              margin: 0;
              padding: 0;
              min-height: 100vh;
              background: #dc2626;
              display: flex;
              justify-content: center;
              align-items: center;
              font-family: system-ui, sans-serif;
            }
            .login-container {
              width: 100%;
              max-width: 400px;
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              margin: 1rem;
            }
            .logo {
              text-align: center;
              margin-bottom: 2rem;
            }
            .logo-circle {
              width: 40px;
              height: 40px;
              background: #dc2626;
              border-radius: 50%;
              margin: 0 auto 1rem;
              animation: spin 2s linear infinite;
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .form-group {
              margin-bottom: 1rem;
            }
            .form-group label {
              display: block;
              margin-bottom: 0.5rem;
              font-size: 0.875rem;
              color: #374151;
            }
            .form-group input {
              width: 100%;
              padding: 0.5rem;
              border: 1px solid #d1d5db;
              border-radius: 4px;
              font-size: 1rem;
              transition: border-color 0.2s, box-shadow 0.2s;
            }
            .form-group input:focus {
              outline: none;
              border-color: #2563eb;
              box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
            }
            .submit-button {
              width: 100%;
              padding: 0.75rem;
              background: #2563eb;
              color: white;
              border: none;
              border-radius: 4px;
              font-size: 1rem;
              cursor: pointer;
              transition: background-color 0.2s;
            }
            .submit-button:hover {
              background: #1d4ed8;
            }
            .submit-button:active {
              transform: translateY(1px);
            }
            .social-login {
              margin-top: 2rem;
              text-align: center;
            }
            .social-buttons {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 0.5rem;
              margin-top: 1rem;
            }
            .social-button {
              padding: 0.5rem;
              border: 1px solid #d1d5db;
              border-radius: 4px;
              background: white;
              cursor: pointer;
              transition: background-color 0.2s, transform 0.1s;
            }
            .social-button:hover {
              background: #f3f4f6;
            }
            .social-button:active {
              transform: translateY(1px);
            }
            .terms {
              text-align: center;
              font-size: 0.75rem;
              color: #6b7280;
              margin-top: 1rem;
            }
            .error-message {
              color: #dc2626;
              font-size: 0.875rem;
              margin-top: 0.25rem;
            }
            .forgot-password {
              text-align: right;
              margin-bottom: 1rem;
            }
            .forgot-password a {
              color: #2563eb;
              font-size: 0.875rem;
              text-decoration: none;
            }
            .forgot-password a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="login-container">
            <div class="logo">
              <div class="logo-circle"></div>
              <h1 style="font-size: 1.5rem; font-weight: bold;">ClientZone</h1>
            </div>
            <form id="loginForm">
              <div class="form-group">
                <label>Username</label>
                <input type="text" id="username" placeholder="Enter your username" required />
                <div id="usernameError" class="error-message"></div>
              </div>
              <div class="form-group">
                <label>Password</label>
                <input type="password" id="password" placeholder="Enter your password" required />
                <div id="passwordError" class="error-message"></div>
              </div>
              <div class="forgot-password">
                <a href="#" onclick="handleForgotPassword(event)">Forgot Password</a>
              </div>
              <button type="submit" class="submit-button">Login</button>
              <div class="terms">
                By logging in you accept our latest Terms and Conditions
              </div>
              <div class="social-login">
                <div style="position: relative; text-align: center; margin: 1rem 0;">
                  <div style="border-top: 1px solid #d1d5db; position: absolute; top: 50%; width: 100%;"></div>
                  <span style="background: white; padding: 0 0.5rem; position: relative; color: #6b7280; font-size: 0.875rem;">
                    Or login with
                  </span>
                </div>
                <div class="social-buttons">
                  <button type="button" class="social-button" onclick="handleSocialLogin('facebook')">FB</button>
                  <button type="button" class="social-button" onclick="handleSocialLogin('google')">G</button>
                  <button type="button" class="social-button" onclick="handleSocialLogin('github')">GH</button>
                </div>
              </div>
            </form>
          </div>

          <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
              e.preventDefault();

              // Reset error messages
              document.getElementById('usernameError').textContent = '';
              document.getElementById('passwordError').textContent = '';

              const username = document.getElementById('username').value;
              const password = document.getElementById('password').value;

              // Basic validation
              let hasError = false;
              if (!username) {
                document.getElementById('usernameError').textContent = 'Username is required';
                hasError = true;
              }
              if (!password) {
                document.getElementById('passwordError').textContent = 'Password is required';
                hasError = true;
              }

              if (!hasError) {
                const submitButton = e.target.querySelector('.submit-button');
                submitButton.textContent = 'Logging in...';
                submitButton.disabled = true;

                try {
                  // Simulate API call
                  await new Promise(resolve => setTimeout(resolve, 1000));

                  // For demo purposes, show success for specific credentials
                  if (username === 'demo' && password === 'password') {
                    alert('Login successful!');
                    window.location.href = '/dashboard';
                  } else {
                    alert('Invalid credentials. Try demo/password');
                  }
                } catch (error) {
                  alert('Login failed. Please try again.');
                } finally {
                  submitButton.textContent = 'Login';
                  submitButton.disabled = false;
                }
              }
            });

            function handleSocialLogin(provider) {
              alert(\`\${provider} login coming soon!\`);
            }

            function handleForgotPassword(e) {
              e.preventDefault();
              alert('Password reset functionality coming soon!');
            }
          </script>
        </body>
        </html>
      `;

      res.json({ preview });
    } catch (error) {
      console.error("Preview generation failed:", error);
      res.status(500).json({ message: "Failed to generate preview" });
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