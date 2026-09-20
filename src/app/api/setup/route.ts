import { resolveDatabaseUrl } from "@/db";
import { ensureSchema } from "@/lib/server/ensureSchema";

export const dynamic = "force-dynamic";

/** Creates missing tables on a fresh Vercel / Neon / Supabase database. */
export async function GET() {
  if (!resolveDatabaseUrl()) {
    return Response.json(
      {
        ok: false,
        error:
          "No database URL. In the Vercel dashboard open Storage → Create Database (Postgres), or Settings → Environment Variables and add DATABASE_URL (or POSTGRES_URL).",
      },
      { status: 503 },
    );
  }
  try {
    await ensureSchema();
    return Response.json({ ok: true, message: "Database tables are ready." });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Setup failed" },
      { status: 500 },
    );
  }
}
