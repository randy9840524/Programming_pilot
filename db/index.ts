import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create postgres client with explicit configuration
const client = postgres(process.env.DATABASE_URL, {
  max: 1, // Limit connections for Replit environment
  idle_timeout: 0, // Keep connection alive
  connect_timeout: 30, // Extend connect timeout
  ssl: {
    rejectUnauthorized: false // Required for Replit's PostgreSQL
  },
  application_name: "codecraft-ide"
});

// Create drizzle database instance
export const db = drizzle(client, { schema });