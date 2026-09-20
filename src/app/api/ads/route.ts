import { db } from "@/db";
import { ads } from "@/db/schema";
import { ensureSchema } from "@/lib/server/ensureSchema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const rows = await db.select({ slot: ads.slot, version: ads.version }).from(ads).orderBy(asc(ads.slot));
    return Response.json({
      ok: true,
      slots: rows.map((r) => ({
        slot: r.slot,
        version: r.version,
        url: `/api/ads/${r.slot}?v=${r.version}`,
      })),
    });
  } catch {
    return Response.json({ ok: true, slots: [] });
  }
}
