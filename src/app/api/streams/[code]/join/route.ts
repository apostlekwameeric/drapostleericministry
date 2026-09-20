import { db } from "@/db";
import { participants } from "@/db/schema";
import {
  activeParticipants,
  findStream,
  makeToken,
  sanitizeName,
  summarize,
  systemMessage,
} from "@/lib/server/room";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const stream = await findStream(code);

  if (!stream) {
    return Response.json({ error: "Stream not found" }, { status: 404 });
  }
  if (stream.status !== "live") {
    return Response.json({ error: "This live has ended" }, { status: 410 });
  }

  // Reuse an existing identity when the browser already holds a token.
  if (typeof body.token === "string" && body.token.length > 8) {
    const existing = await db
      .select()
      .from(participants)
      .where(
        and(eq(participants.token, body.token), eq(participants.streamId, stream.id)),
      )
      .limit(1);
    if (existing[0]) {
      await db
        .update(participants)
        .set({ active: true })
        .where(eq(participants.id, existing[0].id));
      return Response.json({
        code: stream.code,
        participantId: existing[0].id,
        token: existing[0].token,
        name: existing[0].name,
        role: existing[0].role,
      });
    }
  }

  const name = sanitizeName(body.name, "Viewer");
  const token = makeToken();
  const [viewer] = await db
    .insert(participants)
    .values({
      streamId: stream.id,
      name,
      token,
      role: "viewer",
      media: "none",
      micOn: false,
      camOn: false,
    })
    .returning();

  await systemMessage(stream.id, `${name} joined`);
  const people = await activeParticipants(stream.id);

  return Response.json({
    code: stream.code,
    participantId: viewer.id,
    token,
    name: viewer.name,
    role: "viewer",
    stream: summarize(stream, people),
  });
}
