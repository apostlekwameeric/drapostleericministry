import { db } from "@/db";
import { messages, participants, streams } from "@/db/schema";
import { isAdminRequest, isDefaultPin, unauthorized } from "@/lib/server/admin";
import { getBrand } from "@/lib/server/brand";
import {
  PRESENCE_WINDOW_MS,
  summarize,
  toPublicMessage,
  toPublicParticipant,
} from "@/lib/server/room";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!(await isAdminRequest(url.searchParams.get("at")))) return unauthorized();

  const focusCode = url.searchParams.get("code");
  const sinceMessageId = Number(url.searchParams.get("since") ?? 0) || 0;
  const cutoff = new Date(Date.now() - PRESENCE_WINDOW_MS);

  const rooms = await db
    .select()
    .from(streams)
    .orderBy(desc(streams.createdAt))
    .limit(30);

  const liveIds = rooms.filter((r) => r.status === "live").map((r) => r.id);
  const people =
    liveIds.length > 0
      ? await db
          .select()
          .from(participants)
          .where(
            and(
              inArray(participants.streamId, liveIds),
              eq(participants.active, true),
              gt(participants.lastSeenAt, cutoff),
            ),
          )
          .orderBy(participants.id)
      : [];

  const byStream = new Map<number, typeof people>();
  for (const p of people) {
    const list = byStream.get(p.streamId) ?? [];
    list.push(p);
    byStream.set(p.streamId, list);
  }

  const list = rooms.map((room) => {
    const crowd = byStream.get(room.id) ?? [];
    const host = crowd.find((p) => p.role === "host");
    return {
      ...summarize(room, crowd),
      id: room.id,
      endedAt: room.endedAt?.toISOString() ?? null,
      hostOnline: Boolean(host),
      hostDevice: host?.deviceInfo ?? null,
      hostMic: host?.micOn ?? null,
      hostCam: host?.camOn ?? null,
      hostMedia: host?.media ?? null,
      participants: crowd.map((p) => ({ ...toPublicParticipant(p), muted: p.muted })),
    };
  });

  const focus =
    (focusCode ? list.find((r) => r.code === focusCode.toLowerCase()) : null) ??
    list.find((r) => r.status === "live") ??
    null;

  let chat: ReturnType<typeof toPublicMessage>[] = [];
  if (focus) {
    const rows = await db
      .select()
      .from(messages)
      .where(and(eq(messages.streamId, focus.id), gt(messages.id, sinceMessageId)))
      .orderBy(desc(messages.id))
      .limit(500);
    chat = rows.reverse().map(toPublicMessage);
  }

  const [totals] = await db
    .select({
      streams: sql<number>`count(*)::int`,
      ended: sql<number>`count(*) filter (where ${streams.status} = 'ended')::int`,
    })
    .from(streams);

  return Response.json({
    ok: true,
    brand: await getBrand(),
    defaultPin: await isDefaultPin(),
    rooms: list,
    focusCode: focus?.code ?? null,
    chat,
    totals: { streams: Number(totals?.streams ?? 0), ended: Number(totals?.ended ?? 0) },
    serverTime: new Date().toISOString(),
  });
}
