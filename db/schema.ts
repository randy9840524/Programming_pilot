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
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFileSchema = createInsertSchema(files);
export const selectFileSchema = createSelectSchema(files);
export type InsertFile = typeof files.$inferInsert;
export type SelectFile = typeof files.$inferSelect;