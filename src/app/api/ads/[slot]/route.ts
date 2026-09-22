import { db } from "@/db";
import { ads } from "@/db/schema";
import { isAdminRequest, unauthorized } from "@/lib/server/admin";
import { databaseConfigured, noDatabaseJson } from "@/lib/server/dbGuard";
import { ensureSchema } from "@/lib/server/ensureSchema";
import { acceptImage, ImageError, readUploadedImage } from "@/lib/server/imageUpload";
import { readPublicFile } from "@/lib/server/staticFile";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function slotNum(raw: string) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 9) return null;
  return n;
}

async function fallbackAd(slot: number) {
  const file =
    (await readPublicFile(`ads/ad-${slot}.jpg`)) ??
    (await readPublicFile(`ad-${slot}.jpg`)) ??
    (await readPublicFile("samples/demo-banner.jpg"));

  if (!file) {
    // 1x1 transparent PNG fallback so img tags never error out
    const tiny = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    return new Response(new Uint8Array(tiny), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  }

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.data.byteLength),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slot: string }> },
) {
  const slot = slotNum((await params).slot);
  if (!slot) return new Response("Not found", { status: 404 });

  if (databaseConfigured()) {
    try {
      await ensureSchema();
      const rows = await db.select().from(ads).where(eq(ads.slot, slot)).limit(1);
      const row = rows[0];
      if (row?.data && row.data.length > 50) {
        const body = new Uint8Array(row.data);
        return new Response(body, {
          headers: {
            "Content-Type": row.mime,
            "Content-Length": String(body.byteLength),
            "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
            ETag: `"ad-${slot}-${row.version}"`,
          },
        });
      }
    } catch {
      /* fall through to default fallback */
    }
  }

  return fallbackAd(slot);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slot: string }> },
) {
  try {
    if (!databaseConfigured()) return noDatabaseJson();
    const slot = slotNum((await params).slot);
    if (!slot) return Response.json({ ok: false, error: "Slot must be 1–9" }, { status: 400 });
    const { bytes, fields } = await readUploadedImage(request, 4 * 1024 * 1024);
    if (!(await isAdminRequest(fields.adminToken || fields.token))) return unauthorized();
    if (!bytes) return Response.json({ ok: false, error: "No image received" }, { status: 400 });
    const image = acceptImage(bytes);
    await ensureSchema();
    const existing = await db.select({ version: ads.version }).from(ads).where(eq(ads.slot, slot)).limit(1);
    const version = (existing[0]?.version ?? 0) + 1;
    await db
      .insert(ads)
      .values({
        slot,
        mime: image.mime,
        data: image.data,
        version,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: ads.slot,
        set: { mime: image.mime, data: image.data, version, updatedAt: new Date() },
      });
    return Response.json({ ok: true, slot, version, url: `/api/ads/${slot}?v=${version}` });
  } catch (err) {
    if (err instanceof ImageError) {
      return Response.json({ ok: false, error: err.message }, { status: err.status });
    }
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slot: string }> },
) {
  try {
    if (!databaseConfigured()) return noDatabaseJson();
    const slot = slotNum((await params).slot);
    if (!slot) return Response.json({ ok: false, error: "Slot must be 1–9" }, { status: 400 });
    const body = (await request.json().catch(() => ({}))) as { adminToken?: string };
    if (!(await isAdminRequest(body.adminToken))) return unauthorized();
    await db.delete(ads).where(eq(ads.slot, slot));
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Could not remove ad" },
      { status: 500 },
    );
  }
}
