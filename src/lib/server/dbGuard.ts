import { resolveDatabaseUrl } from "@/db";

export function databaseConfigured() {
  return Boolean(resolveDatabaseUrl());
}

export const NO_DB_MESSAGE =
  "No Postgres database is connected on Vercel. Open the project → Storage → Create Database (Postgres) and connect it, or add DATABASE_URL (or POSTGRES_URL) under Settings → Environment Variables, then Redeploy.";

export function noDatabaseJson(extra: Record<string, unknown> = {}) {
  return Response.json({ ok: false, error: NO_DB_MESSAGE, ...extra }, { status: 503 });
}
