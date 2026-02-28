import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Validate required env var
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create postgres connection
// - max: 10 connections for API server
// - For migrations (drizzle-kit), use max: 1
const sql = postgres(connectionString, { max: 10 });

// Create Drizzle instance with full schema (enables relational queries)
export const db = drizzle(sql, { schema });

// Export the raw sql client for advanced use cases
export { sql };
