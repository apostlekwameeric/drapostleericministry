import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) return new Response("Not found", { status: 404 });
  try {
    const rows = await db
      .select({
        photoData: participants.photoData,
        photoMime: participants.photoMime,
        photoVersion: participants.photoVersion,
      })
      .from(participants)
      .where(eq(participants.id, id))
      .limit(1);
    const row = rows[0];
    if (!row?.photoData || !row.photoMime) return new Response("No photo", { status: 404 });
    const body = new Uint8Array(row.photoData);
    return new Response(body, {
      headers: {
        "Content-Type": row.photoMime,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
        ETag: `"photo-${id}-${row.photoVersion}"`,
      },
    });
  } catch {
    return new Response("No photo", { status: 404 });
  }
}
