import dotenv from "dotenv";

dotenv.config(); // Load environment variables from the .env file

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in the .env file");
}

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";

// Configure PostgreSQL client
const client = postgres(process.env.DATABASE_URL, {
  max: 1,
  idle_timeout: 0,
  connect_timeout: 20,
  ssl: true,
  connection: {
    application_name: 'codecraft-ide',
  },
});

export const db = drizzle(client, { schema });
