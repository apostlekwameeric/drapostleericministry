import { db } from "@/db";
import { ads } from "@/db/schema";
import { isAdminRequest, unauthorized } from "@/lib/server/admin";
import { databaseConfigured, noDatabaseJson } from "@/lib/server/dbGuard";
import { ensureSchema } from "@/lib/server/ensureSchema";
import { acceptImage, ImageError, readUploadedImage } from "@/lib/server/imageUpload";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function slotNum(raw: string) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 9) return null;
  return n;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slot: string }> },
) {
  const slot = slotNum((await params).slot);
  if (!slot) return new Response("Not found", { status: 404 });
  try {
    await ensureSchema();
    const rows = await db.select().from(ads).where(eq(ads.slot, slot)).limit(1);
    const row = rows[0];
    if (!row?.data) return new Response("Not found", { status: 404 });
    const body = new Uint8Array(row.data);
    return new Response(body, {
      headers: {
        "Content-Type": row.mime,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
        ETag: `"ad-${slot}-${row.version}"`,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
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
