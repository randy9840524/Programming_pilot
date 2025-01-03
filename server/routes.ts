import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupCollaborativeEditing } from "./collaborative";
import { db } from "@db";
import { files, codeSnippets } from "@db/schema";
import { eq, and, ilike, or } from "drizzle-orm";
import OpenAI from "openai";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

export function registerRoutes(app: Express): Server {
  // Create HTTP server
  const httpServer = createServer(app);

  // Set up WebSocket server for collaborative editing
  setupCollaborativeEditing(httpServer);

  // Serve Monaco Editor assets
  const monacoDir = path.resolve(__dirname, '../node_modules/monaco-editor');
  app.use('/monaco-editor', express.static(path.join(monacoDir, 'min')));
  app.use('/monaco-editor/esm', express.static(path.join(monacoDir, 'esm')));

  // File upload endpoint with OCR support
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      const folderPath = req.body.path || "";
      const processOCR = req.body.processOCR === "true";

      if (!file) {
        return res.status(400).send("No file uploaded");
      }

      // Verify file type
      const fileType = await fileTypeFromBuffer(file.buffer);
      if (!fileType) {
        return res.status(400).send("Invalid file type");
      }

      const fileName = file.originalname;
      const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;

      const [existing] = await db
        .select()
        .from(files)
        .where(eq(files.path, fullPath));

      if (existing) {
        return res.status(400).send("File already exists");
      }

      let extractedText = "";
      if (processOCR && file.mimetype === "application/pdf") {
        try {
          const worker = await createWorker();
          await worker.loadLanguage('eng');
          await worker.initialize('eng');
          const { data: { text } } = await worker.recognize(file.buffer);
          await worker.terminate();
          extractedText = text;
        } catch (error) {
          console.error("OCR processing failed:", error);
        }
      }

      // Store file in database
      const [newFile] = await db
        .insert(files)
        .values({
          path: fullPath,
          name: fileName,
          type: "file",
          content: file.buffer.toString("base64"),
          metadata: {
            mimeType: file.mimetype,
            size: file.size,
            lastModified: new Date().toISOString(),
            extractedText: extractedText || undefined,
          },
        })
        .returning();

      res.status(201).json(newFile);
    } catch (error) {
      console.error("Upload failed:", error);
      res.status(500).send("Failed to upload file");
    }
  });

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

      // If the file is binary (has base64 content), decode and send with proper content type
      if (file.metadata?.mimeType) {
        const buffer = Buffer.from(file.content, "base64");
        res.setHeader("Content-Type", file.metadata.mimeType);
        return res.send(buffer);
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

  // Code Snippet Routes
  app.get("/api/snippets", async (req, res) => {
    try {
      const searchQuery = req.query.q as string;
      let query = db.select().from(codeSnippets);

      if (searchQuery) {
        query = query.where(
          or(
            ilike(codeSnippets.title, `%${searchQuery}%`),
            ilike(codeSnippets.description, `%${searchQuery}%`)
          )
        );
      }

      const snippets = await query;
      res.json(snippets);
    } catch (error) {
      console.error("Failed to fetch snippets:", error);
      res.status(500).send("Failed to fetch snippets");
    }
  });

  app.post("/api/snippets", async (req, res) => {
    try {
      const { title, description, code, language, tags } = req.body;

      // Generate metadata using AI
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Analyze the following code snippet and provide metadata including framework used, complexity score (1-10), and estimated performance impact (1-10). Respond in JSON format.",
          },
          {
            role: "user",
            content: code,
          },
        ],
        response_format: { type: "json_object" },
      });

      const aiMetadata = JSON.parse(completion.choices[0].message.content);

      const [snippet] = await db
        .insert(codeSnippets)
        .values({
          title,
          description,
          code,
          language,
          tags,
          metadata: {
            ...aiMetadata,
            aiGenerated: false,
          },
        })
        .returning();

      res.status(201).json(snippet);
    } catch (error) {
      console.error("Failed to create snippet:", error);
      res.status(500).send("Failed to create snippet");
    }
  });


  // AI Code Analysis
  app.post("/api/analyze", async (req, res) => {
    try {
      const { code, prompt } = req.body;

      if (!code || !prompt) {
        return res.status(400).json({ 
          error: "Missing required parameters", 
          message: "Both code and prompt are required" 
        });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ 
          error: "Configuration error", 
          message: "OpenAI API key is not configured" 
        });
      }

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
        max_tokens: 2000,
        temperature: 0.7,
      });

      if (!completion.choices[0]?.message?.content) {
        throw new Error("No response from OpenAI");
      }

      res.json({ response: completion.choices[0].message.content });
    } catch (error: any) {
      console.error("AI analysis failed:", error);
      const errorMessage = error.response?.data?.error?.message || error.message || "Failed to analyze code";
      res.status(500).json({ 
        error: "AI Analysis Error",
        message: errorMessage
      });
    }
  });

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

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
}