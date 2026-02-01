import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as appSchema from "../../../db/schema";
import * as authSchema from "../../../db/auth-schema";

// Astro loads .env automatically - use import.meta.env
const DATABASE_URL = import.meta.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(DATABASE_URL);

// Merge both schemas for Drizzle
const schema = { ...appSchema, ...authSchema };

export const db = drizzle(client, { schema });

// Re-export schemas for convenience
export * from "../../../db/schema";
export * from "../../../db/auth-schema";
