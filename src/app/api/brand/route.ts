import { db } from "@/db";
import { brand } from "@/db/schema";
import { isAdminRequest, unauthorized } from "@/lib/server/admin";
import { BRAND_ROW_ID, DEFAULT_BRAND, getBrand } from "@/lib/server/brand";
import { databaseConfigured, noDatabaseJson } from "@/lib/server/dbGuard";
import { acceptImage, ImageError, readUploadedImage } from "@/lib/server/imageUpload";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_RAW_BYTES = 4 * 1024 * 1024;

function fail(message: string, status: number) {
  return Response.json({ ok: false, error: message }, { status });
}

export async function GET() {
  try {
    const info = await getBrand();
    return Response.json({ ...info, hasLogo: true });
  } catch {
    return Response.json({ ...DEFAULT_BRAND, hasLogo: true, logoVersion: 1 });
  }
}

export async function POST(request: Request) {
  try {
    if (!databaseConfigured()) return noDatabaseJson();

    const { bytes, fields } = await readUploadedImage(request, MAX_RAW_BYTES);
    if (!(await isAdminRequest(fields.adminToken || fields.token))) return unauthorized();
    const name = fields.name?.trim() ? fields.name.trim().slice(0, 80) : undefined;
    const tagline = fields.tagline !== undefined ? fields.tagline.trim().slice(0, 80) : undefined;

    let logo: { data: Buffer; mime: string } | null = null;
    if (bytes) logo = acceptImage(bytes);

    await db
      .insert(brand)
      .values({
        id: BRAND_ROW_ID,
        name: name ?? DEFAULT_BRAND.name,
        tagline: tagline ?? DEFAULT_BRAND.tagline,
        logoMime: logo?.mime ?? null,
        logoData: logo?.data ?? null,
        logoVersion: logo ? 1 : 0,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: brand.id,
        set: {
          ...(name !== undefined ? { name } : {}),
          ...(tagline !== undefined ? { tagline } : {}),
          ...(logo
            ? {
                logoMime: logo.mime,
                logoData: logo.data,
                logoVersion: sql`${brand.logoVersion} + 1`,
              }
            : {}),
          updatedAt: new Date(),
        },
      });

    return Response.json({ ok: true, brand: await getBrand() });
  } catch (err) {
    if (err instanceof ImageError) return fail(err.message, err.status);
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[brand] save failed:", message);
    return fail(`Could not save on the server: ${message}`, 500);
  }
}

export async function DELETE() {
  try {
    if (!databaseConfigured()) return noDatabaseJson();
    if (!(await isAdminRequest())) return unauthorized();
    await db
      .insert(brand)
      .values({
        id: BRAND_ROW_ID,
        name: DEFAULT_BRAND.name,
        tagline: DEFAULT_BRAND.tagline,
        logoMime: null,
        logoData: null,
        logoVersion: 0,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: brand.id,
        set: { logoMime: null, logoData: null, logoVersion: 0, updatedAt: new Date() },
      });
    return Response.json({ ok: true, brand: await getBrand() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return fail(`Could not remove the logo: ${message}`, 500);
  }
}
