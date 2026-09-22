import { db } from "@/db";
import { ads } from "@/db/schema";
import { ensureSchema } from "@/lib/server/ensureSchema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const rows = await db.select({ slot: ads.slot, version: ads.version }).from(ads).orderBy(asc(ads.slot));
    const customMap = new Map(rows.map((r) => [r.slot, r.version]));

    // Return all 9 slots: if uploaded/customized in DB, with custom version; otherwise default version 0
    const allSlots = Array.from({ length: 9 }, (_, i) => {
      const slot = i + 1;
      const version = customMap.get(slot) ?? 0;
      return {
        slot,
        version,
        url: `/api/ads/${slot}?v=${version}`,
        isCustom: customMap.has(slot),
      };
    });

    return Response.json({
      ok: true,
      slots: allSlots,
    });
  } catch {
    // If DB is offline, return all 9 slots pointing to default fallback images
    const defaultSlots = Array.from({ length: 9 }, (_, i) => ({
      slot: i + 1,
      version: 0,
      url: `/api/ads/${i + 1}?v=0`,
      isCustom: false,
    }));
    return Response.json({ ok: true, slots: defaultSlots });
  }
}
