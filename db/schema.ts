import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  path: text("path").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "file" | "folder"
  content: text("content"),
  metadata: jsonb("metadata").$type<{
    language?: string;
    lastModified?: string;
    size?: number;
    mimeType?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const codeSnippets = pgTable("code_snippets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  code: text("code").notNull(),
  language: text("language").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<{
    framework?: string;
    aiGenerated?: boolean;
    complexity?: number;
    performance?: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFileSchema = createInsertSchema(files);
export const selectFileSchema = createSelectSchema(files);
export type InsertFile = typeof files.$inferInsert;
export type SelectFile = typeof files.$inferSelect;

export const insertSnippetSchema = createInsertSchema(codeSnippets);
export const selectSnippetSchema = createSelectSchema(codeSnippets);
export type InsertSnippet = typeof codeSnippets.$inferInsert;
export type SelectSnippet = typeof codeSnippets.$inferSelect;