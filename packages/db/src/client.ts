import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Lazy-initialize the database connection to avoid build-time errors.
// The actual connection is created on first use.
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _sql: ReturnType<typeof postgres> | null = null;

function getConnection() {
  if (_db) return { db: _db, sql: _sql! };

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  _sql = postgres(connectionString, { max: 10 });
  _db = drizzle(_sql, { schema });
  return { db: _db, sql: _sql };
}

// Proxy that lazily initializes on first method access
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return getConnection().db[prop as keyof typeof _db];
  },
});

export const sql = new Proxy({} as ReturnType<typeof postgres>, {
  get(_target, prop) {
    return getConnection().sql[prop as keyof typeof _sql];
  },
});
