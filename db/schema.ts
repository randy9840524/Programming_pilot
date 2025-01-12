import { pgTable, text, serial, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

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

// Project schemas with proper validation
export const insertProjectSchema = createInsertSchema(projects, {
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  language: z.string().optional(),
  framework: z.string().optional(),
  ownerId: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export const selectProjectSchema = createSelectSchema(projects);
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type SelectProject = z.infer<typeof selectProjectSchema>;

export const artifacts = pgTable("artifacts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  contentType: text("content_type").notNull(),
  projectId: integer("project_id").references(() => projects.id),
  version: integer("version").default(1),
  metadata: jsonb("metadata").$type<{
    language?: string;
    framework?: string;
    tags?: string[];
    lastEditDescription?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const artifactVersions = pgTable("artifact_versions", {
  id: serial("id").primaryKey(),
  artifactId: integer("artifact_id").references(() => artifacts.id),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  description: text("description"),
  metadata: jsonb("metadata").$type<{
    editType: "targeted" | "full";
    changes?: string[];
    performance?: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export const insertArtifactSchema = createInsertSchema(artifacts);
export const selectArtifactSchema = createSelectSchema(artifacts);
export type InsertArtifact = z.infer<typeof insertArtifactSchema>;
export type SelectArtifact = z.infer<typeof selectArtifactSchema>;

export const insertArtifactVersionSchema = createInsertSchema(artifactVersions);
export const selectArtifactVersionSchema = createSelectSchema(artifactVersions);
export type InsertArtifactVersion = z.infer<typeof insertArtifactVersionSchema>;
export type SelectArtifactVersion = z.infer<typeof selectArtifactVersionSchema>;

export const insertFileSchema = createInsertSchema(files);
export const selectFileSchema = createSelectSchema(files);
export type InsertFile = typeof files.$inferInsert;
export type SelectFile = typeof files.$inferSelect;

export const insertSnippetSchema = createInsertSchema(codeSnippets);
export const selectSnippetSchema = createSelectSchema(codeSnippets);
export type InsertSnippet = typeof codeSnippets.$inferInsert;
export type SelectSnippet = typeof codeSnippets.$inferSelect;