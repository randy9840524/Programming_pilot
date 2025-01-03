import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Tables for collaborative editing
export const collaborativeSessions = pgTable("collaborative_sessions", {
  id: serial("id").primaryKey(),
  documentId: text("document_id").notNull(),
  content: text("content"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const collaborativeUsers = pgTable("collaborative_users", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => collaborativeSessions.id),
  userId: integer("user_id").references(() => users.id),
  cursorPosition: jsonb("cursor_position").$type<{x: number, y: number}>(),
  lastActive: timestamp("last_active").defaultNow(),
});

// Existing tables with relationships
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: integer("owner_id").references(() => users.id),
  language: text("language"),
  framework: text("framework"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schema for type safety
export const insertProjectSchema = createInsertSchema(projects, {
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  language: z.string().optional(),
  framework: z.string().optional(),
});

export const selectProjectSchema = createSelectSchema(projects);
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type SelectProject = z.infer<typeof selectProjectSchema>;

export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = z.infer<typeof selectUserSchema>;


export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  name: text("name").notNull(),
  content: text("content"),
  type: text("type").notNull(),
  path: text("path").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const codeSnippets = pgTable("code_snippets", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
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

// File schemas
export const insertFileSchema = createInsertSchema(files);
export const selectFileSchema = createSelectSchema(files);
export type InsertFile = typeof files.$inferInsert;
export type SelectFile = typeof files.$inferSelect;

// Code snippet schemas
export const insertSnippetSchema = createInsertSchema(codeSnippets);
export const selectSnippetSchema = createSelectSchema(codeSnippets);
export type InsertSnippet = typeof codeSnippets.$inferInsert;
export type SelectSnippet = typeof codeSnippets.$inferSelect;