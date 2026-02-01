import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as appSchema from "./schema";
import * as authSchema from "./auth-schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Merge both schemas for Drizzle
const schema = { ...appSchema, ...authSchema };

export const db = drizzle(pool, { schema });

// Export all schemas separately for convenience
export * from "./schema";
export * from "./auth-schema";
