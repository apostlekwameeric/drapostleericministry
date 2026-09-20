import { db } from "@/db";
import { streamCovers, streams } from "@/db/schema";
import { databaseConfigured, noDatabaseJson } from "@/lib/server/dbGuard";
import { acceptImage, ImageError, readUploadedImage } from "@/lib/server/imageUpload";
import { authenticate, findStream, systemMessage } from "@/lib/server/room";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_RAW_BYTES = 4 * 1024 * 1024;

function fail(message: string, status: number) {
  return Response.json({ ok: false, error: message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const stream = await findStream(code);
    if (!stream) return new Response("Not found", { status: 404 });

    const rows = await db
      .select()
      .from(streamCovers)
      .where(eq(streamCovers.streamId, stream.id))
      .limit(1);
    const cover = rows[0];
    if (!cover) return new Response("No cover", { status: 404 });

    const body = new Uint8Array(cover.data);
    return new Response(body, {
      headers: {
        "Content-Type": cover.mime,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "public, max-age=30, stale-while-revalidate=300",
        ETag: `"cover-${stream.id}-${stream.coverVersion}"`,
      },
    });
  } catch {
    return new Response("No cover", { status: 404 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    if (!databaseConfigured()) return noDatabaseJson();
    const { bytes, fields } = await readUploadedImage(request, MAX_RAW_BYTES);

    const auth = await authenticate(code, fields.token);
    if (!auth) return fail("You are not part of this live.", 401);
    if (auth.me.role !== "host") return fail("Only the host can set the banner.", 403);
    if (!bytes) return fail("No image received.", 400);

    const image = acceptImage(bytes);

    await db
      .insert(streamCovers)
      .values({
        streamId: auth.stream.id,
        mime: image.mime,
        data: image.data,
        width: image.width,
        height: image.height,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: streamCovers.streamId,
        set: {
          mime: image.mime,
          data: image.data,
          width: image.width,
          height: image.height,
          updatedAt: new Date(),
        },
      });

    const [updated] = await db
      .update(streams)
      .set({ coverVersion: sql`${streams.coverVersion} + 1` })
      .where(eq(streams.id, auth.stream.id))
      .returning({ coverVersion: streams.coverVersion });

    if (auth.stream.coverVersion === 0) {
      await systemMessage(auth.stream.id, `${auth.me.name} added the program banner`);
    }

    return Response.json({ ok: true, coverVersion: updated?.coverVersion ?? 1 });
  } catch (err) {
    if (err instanceof ImageError) return fail(err.message, err.status);
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cover] upload failed:", message);
    return fail(`Could not save the banner: ${message}`, 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const auth = await authenticate(code, body.token);
    if (!auth) return fail("You are not part of this live.", 401);
    if (auth.me.role !== "host") return fail("Host only.", 403);

    await db.delete(streamCovers).where(eq(streamCovers.streamId, auth.stream.id));
    await db.update(streams).set({ coverVersion: 0 }).where(eq(streams.id, auth.stream.id));
    return Response.json({ ok: true });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not remove banner", 500);
  }
}
