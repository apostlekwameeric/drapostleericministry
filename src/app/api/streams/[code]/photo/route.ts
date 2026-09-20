import { db } from "@/db";
import { messages, participants } from "@/db/schema";
import { acceptImage, ImageError, readUploadedImage } from "@/lib/server/imageUpload";
import { authenticate, avatarFor } from "@/lib/server/room";
import { and, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function fail(message: string, status: number) {
  return Response.json({ ok: false, error: message }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const { bytes, fields } = await readUploadedImage(request, 4 * 1024 * 1024);
    const auth = await authenticate(code, fields.token);
    if (!auth) return fail("Not part of this live", 401);
    if (!bytes) return fail("No image received", 400);

    const image = acceptImage(bytes);
    const [updated] = await db
      .update(participants)
      .set({
        photoMime: image.mime,
        photoData: image.data,
        photoVersion: sql`${participants.photoVersion} + 1`,
      })
      .where(eq(participants.id, auth.me.id))
      .returning({ photoVersion: participants.photoVersion });

    const version = updated?.photoVersion ?? 1;
    const url = avatarFor(auth.me.id, auth.me.name, version);
    await db
      .update(messages)
      .set({ avatar: url })
      .where(
        and(eq(messages.streamId, auth.stream.id), eq(messages.participantId, auth.me.id)),
      );

    return Response.json({ ok: true, photoVersion: version, avatar: url });
  } catch (err) {
    if (err instanceof ImageError) return fail(err.message, err.status);
    return fail(err instanceof Error ? err.message : "Upload failed", 500);
  }
}
