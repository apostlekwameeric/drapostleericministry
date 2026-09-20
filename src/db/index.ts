import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Vercel / Neon / Supabase each inject a slightly different env name.
 * Local dev uses DATABASE_URL.
 */
export function resolveDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_CONNECTION_STRING ||
    ""
  );
}

function isLocalhost(url: string) {
  try {
    const u = new URL(url);
    return u.hostname === "127.0.0.1" || u.hostname === "localhost";
  } catch {
    return false;
  }
}

const globalForDb = globalThis as typeof globalThis & {
  __faithLivePool?: Pool;
  __faithLiveDb?: NodePgDatabase;
};

function createPool(url: string) {
  const local = isLocalhost(url);
  return new Pool({
    connectionString: url,
    max: local ? 5 : 1,
    idleTimeoutMillis: local ? 10_000 : 5_000,
    connectionTimeoutMillis: 8_000,
    ssl: local ? false : { rejectUnauthorized: false },
  });
}

export function getPool(): Pool {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error(
      "No database configured. In Vercel: Storage → Create Database (Postgres) → add DATABASE_URL, or set DATABASE_URL / POSTGRES_URL in Project Settings → Environment Variables.",
    );
  }
  if (!globalForDb.__faithLivePool) {
    globalForDb.__faithLivePool = createPool(url);
  }
  return globalForDb.__faithLivePool;
}

export function getDb(): NodePgDatabase {
  if (!globalForDb.__faithLiveDb) {
    globalForDb.__faithLiveDb = drizzle(getPool());
  }
  return globalForDb.__faithLiveDb;
}

/**
 * Lazy stand-in so importing `@/db` during `next build` does not crash
 * when Vercel has not injected DATABASE_URL yet.
 */
export const db = new Proxy({} as NodePgDatabase, {
  get(_target, prop, receiver) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? (value as Function).bind(real) : value;
  },
});
