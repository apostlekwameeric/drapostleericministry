import { db } from "@/db";
import { participants, signals } from "@/db/schema";
import {
  activeParticipants,
  authenticate,
  recentMessages,
  summarize,
  toPublicParticipant,
} from "@/lib/server/room";
import { tickSimulator } from "@/lib/server/simulator";
import type { IncomingSignal, SignalKind, SyncResponse } from "@/lib/types";
import { and, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const auth = await authenticate(code, body.token);
  if (!auth) {
    return Response.json({ error: "Not part of this live" }, { status: 401 });
  }
  const { stream, me } = auth;
  const sinceMessageId = Number(body.sinceMessageId ?? 0) || 0;

  await db
    .update(participants)
    .set({ lastSeenAt: sql`now()`, active: true })
    .where(eq(participants.id, me.id));

  const drained = await db
    .delete(signals)
    .where(and(eq(signals.streamId, stream.id), eq(signals.toId, me.id)))
    .returning();

  const inbox: IncomingSignal[] = drained
    .sort((a, b) => a.id - b.id)
    .map((row) => ({
      id: row.id,
      fromId: row.fromId,
      toId: row.toId,
      kind: row.kind as SignalKind,
      epoch: row.epoch,
      payload: row.payload,
    }));

  // Simulated audience: schedule/deliver generated comments (host-controlled, labelled).
  let simNextAt: Date | null | undefined;
  if (stream.simEnabled) {
    try {
      const claimed = await tickSimulator(stream);
      if (claimed) simNextAt = claimed;
    } catch (err) {
      console.error("[sim] tick failed", err);
    }
  }

  const people = await activeParticipants(stream.id);
  const fresh = people.find((p) => p.id === me.id) ?? { ...me, lastSeenAt: new Date() };
  const chat = await recentMessages(stream.id, sinceMessageId);

  // Remote instruction from the admin dashboard (camera / mic / light), delivered once.
  const lastSeq = Number(body.commandSeq ?? 0) || 0;
  let command: (typeof me)["command"] = null;
  let commandSeq = me.commandSeq;
  if (me.command && me.commandSeq > lastSeq && Date.now() - me.command.issuedAt < 120_000) {
    command = me.command;
  }
  if (me.commandSeq !== lastSeq && !command) commandSeq = me.commandSeq;

  // The device reports its cameras/torch so the dashboard can show real options.
  if (body.device && typeof body.device === "object") {
    const info = body.device as Record<string, unknown>;
    await db
      .update(participants)
      .set({
        deviceInfo: {
          cameras: Array.isArray(info.cameras) ? (info.cameras as never[]).slice(0, 8) : [],
          activeCameraId: typeof info.activeCameraId === "string" ? info.activeCameraId : null,
          activeFacing:
            info.activeFacing === "user" || info.activeFacing === "environment"
              ? info.activeFacing
              : "unknown",
          torchSupported: Boolean(info.torchSupported),
          torchOn: Boolean(info.torchOn),
          reportedAt: Date.now(),
        },
      })
      .where(eq(participants.id, me.id));
  }

  const payload: SyncResponse = {
    stream: summarize(stream, people, { simNextAt }),
    me: { ...toPublicParticipant(fresh), muted: fresh.muted },
    command,
    commandSeq,
    participants: people.map(toPublicParticipant),
    messages: chat,
    signals: inbox,
    serverTime: new Date().toISOString(),
  };

  return Response.json(payload);
}
