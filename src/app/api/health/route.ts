import { resolveDatabaseUrl } from "@/db";
import { db } from "@/db";
import { ensureSchema } from "@/lib/server/ensureSchema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!resolveDatabaseUrl()) {
    return Response.json(
      {
        ok: false,
        error:
          "No database. In Vercel open Storage → Create Database, or add DATABASE_URL / POSTGRES_URL in Settings → Environment Variables.",
      },
      { status: 503 },
    );
  }
  try {
    await ensureSchema();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database connection failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
