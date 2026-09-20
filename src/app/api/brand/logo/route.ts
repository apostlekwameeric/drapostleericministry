import { db } from "@/db";
import { brand } from "@/db/schema";
import { BRAND_ROW_ID } from "@/lib/server/brand";
import { databaseConfigured } from "@/lib/server/dbGuard";
import { readPublicFile } from "@/lib/server/staticFile";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function fallbackLogo() {
  const file =
    (await readPublicFile("brand/logo.png")) ??
    (await readPublicFile("chapel-logo.png")) ??
    (await readPublicFile("brand/act-of-faith-logo.png")) ??
    (await readPublicFile("samples/ministry-logo.png"));
  if (!file) {
    // 1×1 transparent PNG so the <img> never breaks if files were not bundled.
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

export async function GET() {
  if (databaseConfigured()) {
    try {
      const rows = await db.select().from(brand).where(eq(brand.id, BRAND_ROW_ID)).limit(1);
      const row = rows[0];
      if (row?.logoData && row.logoMime && row.logoData.length > 500) {
        const body = new Uint8Array(row.logoData);
        return new Response(body, {
          headers: {
            "Content-Type": row.logoMime,
            "Content-Length": String(body.byteLength),
            "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
            ETag: `"logo-${row.logoVersion}"`,
          },
        });
      }
    } catch {
      /* fall through to the bundled chapel logo */
    }
  }
  return fallbackLogo();
}
