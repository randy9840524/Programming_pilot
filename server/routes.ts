import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { promisify } from "util";

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

  // Simple health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // AI Analysis endpoint
  app.post("/api/analyze", async (req, res) => {
    try {
      const { prompt } = req.body;
      console.log("Received analyze request:", { prompt });

      if (!process.env.OPENAI_API_KEY) {
        console.error("OpenAI API key not configured");
        return res.status(500).json({ 
          message: "OpenAI API key not configured" 
        });
      }

      if (!prompt) {
        console.error("Missing prompt");
        return res.status(400).json({ 
          message: "Please provide a development request" 
        });
      }

      let messages;
      const assetsDir = path.join(process.cwd(), "attached_assets");

      // Check if there's a recent image upload and the prompt mentions attachments
      if (prompt.toLowerCase().includes("attach")) {
        const latestImage = await getLatestFile(assetsDir);
        console.log("Latest image found:", latestImage);

        if (latestImage) {
          try {
            const imageBuffer = await fs.promises.readFile(latestImage);
            messages = [
              {
                role: "system",
                content: `You are an expert software development assistant specializing in building web applications.
You have access to a powerful IDE environment and can help users build and modify their applications.

When users request to build or modify applications:
1. First analyze and acknowledge their requirements
2. Break down the implementation into clear steps
3. Provide specific code samples for each step
4. Focus on practical, implementable solutions
5. Always provide complete code snippets that can be directly used

For UI/design requests:
- Provide complete React component code including all necessary imports
- Include exact Tailwind CSS classes for styling
- Explain the integration steps clearly

Remember:
- You can implement any feature the user requests
- Keep responses focused on practical implementation
- Provide working code that fits the existing React/TypeScript stack
- Be specific and detailed in your implementation guidance`,
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: prompt
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/png;base64,${imageBuffer.toString('base64')}`
                    }
                  }
                ],
              },
            ];
          } catch (error) {
            console.error("Error reading image file:", error);
            messages = [{ role: "user", content: prompt }];
          }
        } else {
          messages = [{ role: "user", content: prompt }];
        }
      } else {
        messages = [{ role: "user", content: prompt }];
      }

      console.log("Sending request to OpenAI");
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 3000,
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

  return httpServer;
}