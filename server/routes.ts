import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

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
          message: "Please provide a development request or question" 
        });
      }

      console.log("Sending request to OpenAI");
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert software development assistant specializing in building web applications.
Your primary role is to help users build and modify their applications by providing specific, actionable code and implementation guidance.

When users request to build or modify applications:
1. Analyze their requirements carefully
2. Provide specific implementation steps
3. Share relevant code snippets and file structures
4. Explain how to integrate different components
5. Focus on practical, implementable solutions

If the user shares screenshots or describes UI requirements:
- Provide specific HTML/CSS/React component implementations
- Include exact styling and layout code
- Explain component integration steps

Always maintain a development-focused approach and provide concrete solutions rather than general advice.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
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