import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use postgres-js for Docker deployment (standard PostgreSQL connection)
export const connection = postgres(process.env.DATABASE_URL);
export const db = drizzle({ client: connection, schema });