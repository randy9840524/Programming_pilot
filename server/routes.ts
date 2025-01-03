import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupCollaborativeEditing } from "./collaborative";
import { db } from "@db";
import { and, eq, ilike, or } from "drizzle-orm";
import { files } from "@db/schema";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import express from "express";

// Initialize OpenAI with API key from environment variable
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

if (!openai) {
  console.error("WARNING: OpenAI API key is not configured. AI features will be disabled.");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Set up authentication
  setupAuth(app);

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

  // AI Analysis endpoint
  app.post("/api/analyze", async (req, res) => {
    if (!openai) {
      return res.status(500).json({
        error: "Configuration Error",
        message: "OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable."
      });
    }

    try {
      const { code, question } = req.body;

      if (!code || !question) {
        return res.status(400).json({ 
          error: "Missing Parameters", 
          message: "Both code and question are required" 
        });
      }

      console.log("Sending request to OpenAI...");
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a helpful coding assistant. Analyze code and provide concise, accurate responses."
          },
          {
            role: "user",
            content: `${question}\n\nHere's the code:\n\`\`\`\n${code}\n\`\`\``
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response received from OpenAI");
      }

      console.log("Received response from OpenAI");
      res.json({ response });
    } catch (error: any) {
      console.error("AI Analysis failed:", error);

      let errorMessage = "Failed to analyze code";
      if (error.response?.status === 401) {
        errorMessage = "Invalid API key. Please check your OpenAI API key configuration.";
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      res.status(500).json({
        error: "AI Analysis Error",
        message: errorMessage
      });
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


  return httpServer;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
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
          type: i === parts.length - 1 ? file.type : "folder",
          children: i === parts.length - 1 ? undefined : [],
        };

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

//Dummy function to avoid compile errors.  Needs to be replaced with actual OCR implementation.
async function createWorker(){
    return {
        loadLanguage: async () => {},
        initialize: async () => {},
        recognize: async () => ({data: {text: ""}}),
        terminate: async () => {}
    }
}