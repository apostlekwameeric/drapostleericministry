import { db } from "@/db";
import { participants, streams } from "@/db/schema";
import { ensureSchema } from "@/lib/server/ensureSchema";
import { makeCode, makeToken, sanitizeName, systemMessage } from "@/lib/server/room";
import { eq } from "drizzle-orm";

export async function createLiveRoom(input: {
  hostName?: unknown;
  title?: unknown;
  mode?: unknown;
  tagline?: unknown;
  scheduledFor?: unknown;
}) {
  await ensureSchema();
  const hostName = sanitizeName(input.hostName, "Host");
  const mode = input.mode === "audio" ? "audio" : "video";
  const rawTitle = typeof input.title === "string" ? input.title.trim().slice(0, 80) : "";
  const title = rawTitle || `${hostName}'s live`;
  const tagline =
    typeof input.tagline === "string" && input.tagline.trim()
      ? input.tagline.trim().slice(0, 120)
      : null;
  const scheduledFor =
    typeof input.scheduledFor === "string" && input.scheduledFor.trim()
      ? input.scheduledFor.trim().slice(0, 60)
      : null;

  let code = makeCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const clash = await db
      .select({ id: streams.id })
      .from(streams)
      .where(eq(streams.code, code))
      .limit(1);
    if (clash.length === 0) break;
    code = makeCode();
  }

  const [stream] = await db
    .insert(streams)
    .values({
      code,
      title,
      hostName,
      mode,
      status: "live",
      phase: "prelive",
      tagline,
      scheduledFor,
    })
    .returning();

  const token = makeToken();
  const [host] = await db
    .insert(participants)
    .values({
      streamId: stream.id,
      name: hostName,
      token,
      role: "host",
      media: mode,
      micOn: true,
      camOn: mode === "video",
    })
    .returning();

  await systemMessage(stream.id, `${hostName} opened the room — starting soon`);

  return {
    code: stream.code,
    participantId: host.id,
    token,
    name: host.name,
    role: "host" as const,
  };
}
