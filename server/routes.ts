import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { files } from "@db/schema";
import { eq, and } from "drizzle-orm";
import OpenAI from "openai";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
}

export function registerRoutes(app: Express): Server {
  // Serve Monaco Editor assets
  const monacoDir = path.resolve(__dirname, '../node_modules/monaco-editor');
  app.use('/monaco-editor', express.static(path.join(monacoDir, 'min')));
  app.use('/monaco-editor/esm', express.static(path.join(monacoDir, 'esm')));

  // File operations
  app.get("/api/files", async (_req, res) => {
    try {
      const allFiles = await db.select().from(files);
      const tree = buildFileTree(allFiles);
      res.json(tree);
    } catch (error) {
      console.error("Failed to fetch files:", error);
      res.status(500).send("Failed to fetch files");
    }
  });

  app.get("/api/files/:path", async (req, res) => {
    try {
      const filePath = decodeURIComponent(req.params.path);
      const [file] = await db
        .select()
        .from(files)
        .where(eq(files.path, filePath));

      if (!file) {
        return res.status(404).send("File not found");
      }

      res.json(file);
    } catch (error) {
      console.error("Failed to fetch file:", error);
      res.status(500).send("Failed to fetch file");
    }
  });

  app.post("/api/files", async (req, res) => {
    try {
      const { path, name, type } = req.body;
      const fullPath = path ? `${path}/${name}` : name;

      const [existing] = await db
        .select()
        .from(files)
        .where(and(eq(files.path, fullPath), eq(files.name, name)));

      if (existing) {
        return res.status(400).send("File already exists");
      }

      const [file] = await db
        .insert(files)
        .values({
          path: fullPath,
          name,
          type,
          content: type === "file" ? "" : null,
          metadata: { language: type === "file" ? getLanguageFromExt(name.split(".").pop() || "") : undefined },
        })
        .returning();

      res.status(201).json(file);
    } catch (error) {
      console.error("Failed to create file:", error);
      res.status(500).send("Failed to create file");
    }
  });

  app.put("/api/files/:path", async (req, res) => {
    try {
      const filePath = decodeURIComponent(req.params.path);
      const { content } = req.body;

      const [file] = await db
        .update(files)
        .set({ 
          content, 
          updatedAt: new Date(),
          metadata: {
            lastModified: new Date().toISOString(),
            size: content?.length || 0,
          },
        })
        .where(eq(files.path, filePath))
        .returning();

      res.json(file);
    } catch (error) {
      console.error("Failed to update file:", error);
      res.status(500).send("Failed to update file");
    }
  });

  app.delete("/api/files/:path", async (req, res) => {
    try {
      const filePath = decodeURIComponent(req.params.path);
      await db.delete(files).where(eq(files.path, filePath));
      res.json({ message: "Deleted" });
    } catch (error) {
      console.error("Failed to delete file:", error);
      res.status(500).send("Failed to delete file");
    }
  });

  // AI Code Analysis
  app.post("/api/analyze", async (req, res) => {
    try {
      const { code, prompt } = req.body;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert programmer assistant. Analyze code and provide helpful, accurate responses.",
          },
          {
            role: "user",
            content: `Code:\n\n${code}\n\nQuestion: ${prompt}`,
          },
        ],
      });

      res.json({ response: completion.choices[0].message.content });
    } catch (error) {
      console.error("AI analysis failed:", error);
      res.status(500).send("Failed to analyze code");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function buildFileTree(fileList: typeof files.$inferSelect[]): FileNode[] {
  const root: FileNode[] = [];
  const map = new Map<string, FileNode>();

  fileList.forEach((file) => {
    const parts = file.path.split("/");
    let currentPath = "";
    let currentArray = root;

    parts.forEach((part: string, i: number) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!map.has(currentPath)) {
        const node: FileNode = {
          name: part,
          type: i === parts.length - 1 ? file.type as "file" | "folder" : "folder",
        };

        if (node.type === "folder") {
          node.children = [];
        }

        map.set(currentPath, node);
        currentArray.push(node);
      }

      const node = map.get(currentPath)!;
      currentArray = node.children || [];
    });
  });

  return root;
}

function getLanguageFromExt(ext: string): string {
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
  };
  return map[ext] || "plaintext";
}