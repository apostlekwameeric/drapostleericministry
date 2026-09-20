import { db } from "@/db";
import { streamCovers, streams } from "@/db/schema";
import { isAdminRequest, unauthorized } from "@/lib/server/admin";
import { databaseConfigured, noDatabaseJson } from "@/lib/server/dbGuard";
import { acceptImage, ImageError, readUploadedImage } from "@/lib/server/imageUpload";
import { findStream, systemMessage } from "@/lib/server/room";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function fail(message: string, status: number) {
  return Response.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  try {
    if (!databaseConfigured()) return noDatabaseJson();
    const { bytes, fields } = await readUploadedImage(request, 4 * 1024 * 1024);
    if (!(await isAdminRequest(fields.adminToken || fields.token))) return unauthorized();
    const stream = fields.code ? await findStream(fields.code) : null;
    if (!stream) return fail("Room not found", 404);
    if (!bytes) return fail("No image received", 400);

    const image = acceptImage(bytes);
    await db
      .insert(streamCovers)
      .values({
        streamId: stream.id,
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
      .where(eq(streams.id, stream.id))
      .returning({ coverVersion: streams.coverVersion });
    if (stream.coverVersion === 0) {
      await systemMessage(stream.id, "The program banner has been added");
    }
    return Response.json({ ok: true, coverVersion: updated?.coverVersion ?? 1 });
  } catch (err) {
    if (err instanceof ImageError) return fail(err.message, err.status);
    return fail(err instanceof Error ? err.message : "Upload failed", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await isAdminRequest())) return unauthorized();
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const stream = body.code ? await findStream(body.code) : null;
    if (!stream) return fail("Room not found", 404);
    await db.delete(streamCovers).where(eq(streamCovers.streamId, stream.id));
    await db.update(streams).set({ coverVersion: 0 }).where(eq(streams.id, stream.id));
    return Response.json({ ok: true });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not remove banner", 500);
  }
}
