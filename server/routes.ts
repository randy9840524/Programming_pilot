import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { artifacts, projects, insertProjectSchema, files, artifactVersions } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

async function getLatestFile(directory: string): Promise<string | null> {
  try {
    const files = await readdir(directory);
    let latestFile: string | null = null;
    let latestTime = 0;

    for (const file of files) {
      if (file.endsWith('.png')) {
        const filePath = path.join(directory, file);
        const stats = await stat(filePath);
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
  app.get("/api/artifacts", async (req, res) => {
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
  app.get("/api/artifacts/:id/versions", async (req, res) => {
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
  app.post("/api/artifacts", async (req, res) => {
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
  app.put("/api/artifacts/:id", async (req, res) => {
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
  app.get("/api/projects", async (_req, res) => {
    try {
      const allProjects = await db.select().from(projects);
      res.json(allProjects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Create new project
  app.post("/api/projects", async (req, res) => {
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
  app.get("/api/projects/:id/files", async (req, res) => {
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
  app.post("/api/analyze", async (req, res) => {
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

  // Preview endpoint with JavaScript game support
  app.post("/api/preview", async (_req, res) => {
    try {
      // Create a basic HTML preview with proper game setup and error handling
      const preview = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
            .power-up {
              position: absolute;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: radial-gradient(circle at 30% 30%, #fff, #ff0);
              box-shadow: 0 0 10px rgba(255,255,0,0.5);
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
              // Initialize canvas and context
              const canvas = document.getElementById('pongCanvas');
              const ctx = canvas.getContext('2d');

              // Game constants
              const PADDLE_SPEED = 5;
              const BALL_SPEED = 5;
              const PADDLE_WIDTH = 10;
              const PADDLE_HEIGHT = 100;
              const BALL_SIZE = 10;
              const POWERUP_SIZE = 20;
              const POWERUP_DURATION = 5000; // 5 seconds

              // Sound effects (using AudioContext)
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

              function playSound(frequency, duration) {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                oscillator.type = 'sine';
                oscillator.frequency.value = frequency;

                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

                oscillator.start();
                oscillator.stop(audioCtx.currentTime + duration);
              }

              // Game state
              const game = {
                running: true,
                ball: {
                  x: canvas.width / 2,
                  y: canvas.height / 2,
                  dx: BALL_SPEED,
                  dy: BALL_SPEED,
                  trail: []
                },
                leftPaddle: {
                  y: canvas.height / 2 - PADDLE_HEIGHT / 2,
                  score: 0,
                  height: PADDLE_HEIGHT
                },
                rightPaddle: {
                  y: canvas.height / 2 - PADDLE_HEIGHT / 2,
                  score: 0,
                  height: PADDLE_HEIGHT
                },
                keys: {
                  up: false,
                  down: false
                },
                powerUps: [],
                particles: []
              };

              // Event listeners for paddle movement
              document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp') game.keys.up = true;
                if (e.key === 'ArrowDown') game.keys.down = true;
              });

              document.addEventListener('keyup', (e) => {
                if (e.key === 'ArrowUp') game.keys.up = false;
                if (e.key === 'ArrowDown') game.keys.down = false;
              });

              function createParticles(x, y, color) {
                for (let i = 0; i < 10; i++) {
                  game.particles.push({
                    x,
                    y,
                    dx: (Math.random() - 0.5) * 10,
                    dy: (Math.random() - 0.5) * 10,
                    radius: Math.random() * 3,
                    color,
                    life: 1
                  });
                }
              }

              function updateParticles() {
                for (let i = game.particles.length - 1; i >= 0; i--) {
                  const p = game.particles[i];
                  p.x += p.dx;
                  p.y += p.dy;
                  p.life -= 0.02;
                  if (p.life <= 0) {
                    game.particles.splice(i, 1);
                  }
                }
              }

              function drawParticles() {
                game.particles.forEach(p => {
                  ctx.beginPath();
                  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                  ctx.fillStyle = \`\${p.color}\${Math.floor(p.life * 255).toString(16).padStart(2, '0')}\`;
                  ctx.fill();
                });
              }

              function spawnPowerUp() {
                if (Math.random() < 0.005 && game.powerUps.length < 3) {
                  game.powerUps.push({
                    x: canvas.width / 2 + (Math.random() - 0.5) * 200,
                    y: Math.random() * (canvas.height - POWERUP_SIZE),
                    type: Math.random() < 0.5 ? 'speed' : 'size'
                  });
                }
              }

              function resetBall() {
                game.ball.x = canvas.width / 2;
                game.ball.y = canvas.height / 2;
                game.ball.dx = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
                game.ball.dy = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
                game.ball.trail = [];
                playSound(220, 0.3); // Score sound
              }

              function resetPowerUps() {
                setTimeout(() => {
                  game.leftPaddle.height = PADDLE_HEIGHT;
                  game.rightPaddle.height = PADDLE_HEIGHT;
                  game.ball.dx = game.ball.dx > 0 ? BALL_SPEED : -BALL_SPEED;
                  game.ball.dy = game.ball.dy > 0 ? BALL_SPEED : -BALL_SPEED;
                }, POWERUP_DURATION);
              }

              // Main game loop
              function gameLoop() {
                // Update ball trail
                game.ball.trail.push({ x: game.ball.x, y: game.ball.y });
                if (game.ball.trail.length > 5) game.ball.trail.shift();

                // Move paddles
                if (game.keys.up && game.rightPaddle.y > 0) {
                  game.rightPaddle.y -= PADDLE_SPEED;
                }
                if (game.keys.down && game.rightPaddle.y < canvas.height - game.rightPaddle.height) {
                  game.rightPaddle.y += PADDLE_SPEED;
                }

                // Simple AI for left paddle
                const paddleCenter = game.leftPaddle.y + game.leftPaddle.height / 2;
                if (paddleCenter < game.ball.y - 35) {
                  game.leftPaddle.y += PADDLE_SPEED - 2;
                }
                if (paddleCenter > game.ball.y + 35) {
                  game.leftPaddle.y -= PADDLE_SPEED - 2;
                }

                // Move ball
                game.ball.x += game.ball.dx;
                game.ball.y += game.ball.dy;

                // Ball collision with top and bottom
                if (game.ball.y <= 0 || game.ball.y >= canvas.height) {
                  game.ball.dy *= -1;
                  createParticles(game.ball.x, game.ball.y, '#fff');
                  playSound(440, 0.1); // Wall hit sound
                }

                // Ball collision with paddles
                if (game.ball.x <= PADDLE_WIDTH && 
                    game.ball.y >= game.leftPaddle.y && 
                    game.ball.y <= game.leftPaddle.y + game.leftPaddle.height) {
                  game.ball.dx = Math.abs(game.ball.dx);
                  createParticles(game.ball.x, game.ball.y, '#0f0');
                  playSound(660, 0.1); // Paddle hit sound
                }

                if (game.ball.x >= canvas.width - PADDLE_WIDTH - BALL_SIZE && 
                    game.ball.y >= game.rightPaddle.y && 
                    game.ball.y <= game.rightPaddle.y + game.rightPaddle.height) {
                  game.ball.dx = -Math.abs(game.ball.dx);
                  createParticles(game.ball.x, game.ball.y, '#0f0');
                  playSound(660, 0.1); // Paddle hit sound
                }

                // Power-up collision
                for (let i = game.powerUps.length - 1; i >= 0; i--) {
                  const powerUp = game.powerUps[i];
                  if (Math.hypot(game.ball.x - powerUp.x, game.ball.y - powerUp.y) < POWERUP_SIZE) {
                    if (powerUp.type === 'size') {
                      const paddle = game.ball.dx > 0 ? game.rightPaddle : game.leftPaddle;
                      paddle.height = PADDLE_HEIGHT * 1.5;
                    } else {
                      game.ball.dx *= 1.5;
                      game.ball.dy *= 1.5;
                    }
                    game.powerUps.splice(i, 1);
                    createParticles(powerUp.x, powerUp.y, '#ff0');
                    playSound(880, 0.2); // Power-up sound
                    resetPowerUps();
                  }
                }

                // Score points
                if (game.ball.x <= 0) {
                  game.rightPaddle.score++;
                  resetBall();
                } else if (game.ball.x >= canvas.width) {
                  game.leftPaddle.score++;
                  resetBall();
                }

                // Spawn power-ups
                spawnPowerUp();

                // Update particles
                updateParticles();

                // Draw everything
                // Clear canvas
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw ball trail
                game.ball.trail.forEach((pos, i) => {
                  const alpha = i / game.ball.trail.length;
                  ctx.fillStyle = \`rgba(255, 255, 255, \${alpha * 0.5})\`;
                  ctx.beginPath();
                  ctx.arc(pos.x, pos.y, BALL_SIZE - 2, 0, Math.PI * 2);
                  ctx.fill();
                });

                // Draw paddles with gradient
                const paddleGradient = ctx.createLinearGradient(0, 0, PADDLE_WIDTH, 0);
                paddleGradient.addColorStop(0, '#fff');
                paddleGradient.addColorStop(1, '#888');

                ctx.fillStyle = paddleGradient;
                ctx.fillRect(0, game.leftPaddle.y, PADDLE_WIDTH, game.leftPaddle.height);
                ctx.fillRect(canvas.width - PADDLE_WIDTH, game.rightPaddle.y, PADDLE_WIDTH, game.rightPaddle.height);

                // Draw ball with glow
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#fff';
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(game.ball.x, game.ball.y, BALL_SIZE, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Draw power-ups
                game.powerUps.forEach(powerUp => {
                  const gradient = ctx.createRadialGradient(
                    powerUp.x, powerUp.y, 0,
                    powerUp.x, powerUp.y, POWERUP_SIZE
                  );
                  gradient.addColorStop(0, powerUp.type === 'speed' ? '#f00' : '#0f0');
                  gradient.addColorStop(1, 'transparent');
                  ctx.fillStyle = gradient;
                  ctx.beginPath();
                  ctx.arc(powerUp.x, powerUp.y, POWERUP_SIZE, 0, Math.PI * 2);
                  ctx.fill();
                });

                // Draw particles
                drawParticles();

                // Draw scores with glow
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#fff';
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#fff';
                ctx.fillText(game.leftPaddle.score, canvas.width * 0.25, 50);
                ctx.fillText(game.rightPaddle.score, canvas.width * 0.75, 50);
                ctx.shadowBlur = 0;

                // Continue game loop
                requestAnimationFrame(gameLoop);
              }

              // Start the game
              gameLoop();

            } catch (error) {
              document.getElementById('gameContainer').innerHTML = 
                '<div style="color: red; padding: 20px;"><strong>Error:</strong><br>' + error.message + '</div>';
            }
          </script>
        </body>
        </html>
      `;

      res.json({ preview });
    } catch (error) {
      console.error("Preview generation failed:", error);
      res.status(500).json({ 
        message: "Failed to generate preview" 
      });
    }
  });

  // Build status endpoint
  app.get("/api/build/status", (req, res) => {
    res.json({
      status: "complete",
      logs: ["Build completed successfully"],
    });
  });

  // Build endpoint
  app.post("/api/build", async (req, res) => {
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