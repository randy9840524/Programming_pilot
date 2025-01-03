import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { files } from "@db/schema";
import OpenAI from "openai";

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // AI Analysis endpoint
  app.post("/api/analyze", async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "OpenAI API key not configured" });
    }

    try {
      const { prompt, filePath } = req.body;

      if (!prompt) {
        return res.status(400).json({ message: "Missing prompt" });
      }

      let fileContent = "";
      if (filePath) {
        // Get file content if filePath is provided
        const [file] = await db
          .select()
          .from(files)
          .where(eq(files.path, filePath))
          .limit(1);

        if (!file) {
          return res.status(404).json({ message: "File not found" });
        }
        fileContent = file.content;
      }

      // Send to OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant analyzing code and providing clear, concise responses.",
          },
          {
            role: "user",
            content: filePath 
              ? `${prompt}\n\nHere's the code:\n\`\`\`\n${fileContent}\n\`\`\``
              : prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response received");
      }

      res.json({ response });
    } catch (error: any) {
      console.error("AI Analysis failed:", error);
      res.status(500).json({ 
        message: error.message || "Failed to analyze code" 
      });
    }
  });

  // Get file content
  app.get("/api/files/:path", async (req, res) => {
    try {
      const filePath = decodeURIComponent(req.params.path);
      const [file] = await db
        .select()
        .from(files)
        .where(eq(files.path, filePath))
        .limit(1);

      if (!file) {
        return res.status(404).send("File not found");
      }

      res.json(file);
    } catch (error) {
      console.error("Failed to fetch file:", error);
      res.status(500).send("Failed to fetch file");
    }
  });

  return httpServer;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
}