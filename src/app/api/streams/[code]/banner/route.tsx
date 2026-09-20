import { db } from "@/db";
import { brand as brandTable, streamCovers } from "@/db/schema";
import { BRAND_ROW_ID, getBrand } from "@/lib/server/brand";
import { parseFormat, renderBanner } from "@/lib/server/banner";
import { originFromRequest } from "@/lib/server/origin";
import { findStream } from "@/lib/server/room";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const format = parseFormat(new URL(request.url).searchParams.get("format"));
  const origin = originFromRequest(request);
  const joinUrl = `${origin}/live/${code.toLowerCase()}`;

  let title = "Join my live room";
  let hostName = "A host";
  let mode: "video" | "audio" = "video";
  let status: "live" | "ended" = "live";
  let phase: "prelive" | "onair" = "prelive";
  let tagline: string | null = null;
  let scheduledFor: string | null = null;
  let coverDataUrl: string | null = null;
  let brandLogoDataUrl: string | null = null;
  const brandInfo = await getBrand();

  try {
    if (brandInfo.hasLogo) {
      const rows = await db
        .select()
        .from(brandTable)
        .where(eq(brandTable.id, BRAND_ROW_ID))
        .limit(1);
      const row = rows[0];
      // satori cannot rasterise SVG inputs, so only inline bitmap logos.
      if (row?.logoData && row.logoMime && row.logoMime !== "image/svg+xml") {
        brandLogoDataUrl = `data:${row.logoMime};base64,${Buffer.from(row.logoData).toString("base64")}`;
      }
    }
  } catch {
    brandLogoDataUrl = null;
  }

  try {
    const stream = await findStream(code);
    if (stream) {
      title = stream.title;
      hostName = stream.hostName;
      mode = stream.mode === "audio" ? "audio" : "video";
      status = stream.status === "ended" ? "ended" : "live";
      phase = stream.phase === "onair" ? "onair" : "prelive";
      tagline = stream.tagline;
      scheduledFor = stream.scheduledFor;

      if (stream.coverVersion > 0) {
        const rows = await db
          .select()
          .from(streamCovers)
          .where(eq(streamCovers.streamId, stream.id))
          .limit(1);
        const cover = rows[0];
        // GIFs are not rasterised by satori, so only inline still formats.
        if (cover && cover.mime !== "image/gif") {
          coverDataUrl = `data:${cover.mime};base64,${Buffer.from(cover.data).toString("base64")}`;
        }
      }
    }
  } catch {
    /* fall back to defaults so the banner always renders */
  }

  return renderBanner({
    title,
    hostName,
    code: code.toLowerCase(),
    mode,
    url: joinUrl,
    status,
    phase,
    tagline,
    scheduledFor,
    coverDataUrl,
    brandName: brandInfo.name,
    brandTagline: brandInfo.tagline,
    brandLogoDataUrl,
    format,
  });
}
