import { db } from "@/db";
import { brand } from "@/db/schema";
import { isAdminRequest, unauthorized } from "@/lib/server/admin";
import { BRAND_ROW_ID, DEFAULT_BRAND } from "@/lib/server/brand";
import { databaseConfigured, noDatabaseJson } from "@/lib/server/dbGuard";
import { acceptImage, ImageError, readUploadedImage } from "@/lib/server/imageUpload";
import { readPublicFile } from "@/lib/server/staticFile";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function fail(message: string, status: number) {
  return Response.json({ ok: false, error: message }, { status });
}

async function fallbackBanner() {
  const file =
    (await readPublicFile("samples/demo-banner.jpg")) ??
    (await readPublicFile("brand/logo.png")) ??
    (await readPublicFile("chapel-logo.png"));
  if (!file) return new Response("No banner", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.data.byteLength),
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function GET() {
  if (databaseConfigured()) {
    try {
      const rows = await db
        .select({
          data: brand.homeBannerData,
          mime: brand.homeBannerMime,
          version: brand.homeBannerVersion,
        })
        .from(brand)
        .where(eq(brand.id, BRAND_ROW_ID))
        .limit(1);
      const row = rows[0];
      if (row?.data && row.mime && row.data.length > 500) {
        const body = new Uint8Array(row.data);
        return new Response(body, {
          headers: {
            "Content-Type": row.mime,
            "Content-Length": String(body.byteLength),
            "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
            ETag: `"home-banner-${row.version}"`,
          },
        });
      }
    } catch {
      /* fallback */
    }
  }
  return fallbackBanner();
}

export async function POST(request: Request) {
  try {
    if (!databaseConfigured()) return noDatabaseJson();
    const { bytes, fields } = await readUploadedImage(request, 4 * 1024 * 1024);
    if (!(await isAdminRequest(fields.adminToken || fields.token))) return unauthorized();
    if (!bytes) return fail("No image received", 400);
    const image = acceptImage(bytes);

    await db
      .insert(brand)
      .values({
        id: BRAND_ROW_ID,
        name: DEFAULT_BRAND.name,
        tagline: DEFAULT_BRAND.tagline,
        homeBannerMime: image.mime,
        homeBannerData: image.data,
        homeBannerVersion: 1,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: brand.id,
        set: {
          homeBannerMime: image.mime,
          homeBannerData: image.data,
          homeBannerVersion: sql`${brand.homeBannerVersion} + 1`,
          updatedAt: new Date(),
        },
      });

    const { getBrand } = await import("@/lib/server/brand");
    return Response.json({ ok: true, brand: await getBrand() });
  } catch (err) {
    if (err instanceof ImageError) return fail(err.message, err.status);
    return fail(err instanceof Error ? err.message : "Could not save the banner", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!databaseConfigured()) return noDatabaseJson();
    const body = (await request.json().catch(() => ({}))) as { adminToken?: string };
    if (!(await isAdminRequest(body.adminToken))) return unauthorized();
    await db
      .update(brand)
      .set({
        homeBannerMime: null,
        homeBannerData: null,
        homeBannerVersion: 0,
        updatedAt: new Date(),
      })
      .where(eq(brand.id, BRAND_ROW_ID));
    const { getBrand } = await import("@/lib/server/brand");
    return Response.json({ ok: true, brand: await getBrand() });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not remove banner", 500);
  }
}
