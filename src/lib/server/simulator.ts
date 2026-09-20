import { db } from "@/db";
import { messages, participants, simQueue, streams, type Stream } from "@/db/schema";
import { getBrand } from "@/lib/server/brand";
import {
  composeWave,
  detectCue,
  nextWaveDelay,
  type Focus,
  type Pace,
  type SimInput,
  type SimState,
  type WaveKind,
} from "@/lib/sim/engine";
import { buildRoster } from "@/lib/sim/personas";
import { and, desc, eq, lte, ne, sql } from "drizzle-orm";

export const FOCUSES: Focus[] = ["auto", "blessing", "healing", "miracle", "offering", "prayer"];
export const PACE_OPTIONS: Pace[] = ["calm", "normal", "lively"];

export function asFocus(raw: unknown): Focus {
  return FOCUSES.includes(raw as Focus) ? (raw as Focus) : "auto";
}
export function asPace(raw: unknown): Pace {
  return PACE_OPTIONS.includes(raw as Pace) ? (raw as Pace) : "normal";
}

function readState(stream: Stream): SimState {
  const raw = (stream.simState ?? {}) as Partial<SimState>;
  return {
    recentTemplates: raw.recentTemplates ?? [],
    recentPersonas: raw.recentPersonas ?? [],
    clearedAtId: raw.clearedAtId,
    lastReplyAt: raw.lastReplyAt,
  };
}

async function loadInput(stream: Stream): Promise<SimInput> {
  const brand = await getBrand();
  const hostRows = await db
    .select({ id: participants.id })
    .from(participants)
    .where(and(eq(participants.streamId, stream.id), eq(participants.role, "host")))
    .limit(1);
  const hostId = hostRows[0]?.id ?? -1;

  const hostMessages = await db
    .select({ body: messages.body, createdAt: messages.createdAt })
    .from(messages)
    .where(
      and(
        eq(messages.streamId, stream.id),
        eq(messages.participantId, hostId),
        eq(messages.kind, "chat"),
      ),
    )
    .orderBy(desc(messages.id))
    .limit(8);

  const realMessages = await db
    .select({ name: messages.name, body: messages.body, createdAt: messages.createdAt })
    .from(messages)
    .where(
      and(
        eq(messages.streamId, stream.id),
        eq(messages.origin, "real"),
        eq(messages.kind, "chat"),
        ne(messages.participantId, hostId),
      ),
    )
    .orderBy(desc(messages.id))
    .limit(10);

  return {
    now: Date.now(),
    hostName: stream.hostName,
    brandName: brand.name,
    title: stream.title,
    tagline: stream.tagline,
    topicText: stream.simContext,
    transcript: stream.simTranscript,
    focus: asFocus(stream.simFocus),
    hostMessages: hostMessages.map((m) => ({ body: m.body, at: m.createdAt.getTime() })),
    realMessages: realMessages.map((m) => ({
      name: m.name,
      body: m.body,
      at: m.createdAt.getTime(),
    })),
  };
}

/** Compose a wave and queue it for gradual delivery. */
export async function planWave(
  stream: Stream,
  kind: WaveKind,
  opts: { count?: number; replyTo?: { name: string; body: string } } = {},
) {
  const input = await loadInput(stream);
  const roster = buildRoster(stream.id, 240);
  const state = readState(stream);
  const { comments, state: nextState } = composeWave(input, roster, state, {
    kind,
    pace: asPace(stream.simPace),
    count: opts.count,
    replyTo: opts.replyTo,
  });
  if (comments.length === 0) return 0;

  const base = Date.now();
  await db.insert(simQueue).values(
    comments.map((c) => ({
      streamId: stream.id,
      name: c.name,
      avatar: c.avatar,
      body: c.body,
      kind: c.kind,
      meta: c.meta,
      deliverAt: new Date(base + c.offset * 1000),
    })),
  );
  await db
    .update(streams)
    .set({ simState: { ...nextState, clearedAtId: state.clearedAtId } })
    .where(eq(streams.id, stream.id));
  return comments.length;
}

/** Move due queued comments into the real chat feed. */
export async function flushDue(streamId: number) {
  const due = await db
    .delete(simQueue)
    .where(and(eq(simQueue.streamId, streamId), lte(simQueue.deliverAt, sql`now()`)))
    .returning();
  if (due.length === 0) return 0;
  due.sort((a, b) => a.deliverAt.getTime() - b.deliverAt.getTime());
  await db.insert(messages).values(
    due.map((row) => ({
      streamId,
      participantId: null,
      name: row.name,
      body: row.body,
      kind: row.kind,
      origin: "sim",
      avatar: row.avatar,
      meta: row.meta,
    })),
  );
  await db
    .update(streams)
    .set({ simCount: sql`${streams.simCount} + ${due.length}` })
    .where(eq(streams.id, streamId));
  return due.length;
}

/**
 * Called on every sync. Claims the next wave atomically (so concurrent viewers
 * never double-schedule) and flushes anything that is due.
 */
export async function tickSimulator(stream: Stream): Promise<Date | null> {
  if (!stream.simEnabled || stream.status !== "live") return null;

  const delay = nextWaveDelay(asPace(stream.simPace));
  const claimed = await db
    .update(streams)
    .set({ simNextAt: sql`now() + make_interval(secs => ${delay})` })
    .where(
      and(
        eq(streams.id, stream.id),
        eq(streams.simEnabled, true),
        sql`(${streams.simNextAt} is null or ${streams.simNextAt} <= now())`,
      ),
    )
    .returning({ simNextAt: streams.simNextAt });

  let nextAt: Date | null = null;
  if (claimed.length > 0) {
    nextAt = claimed[0].simNextAt;
    try {
      await planWave(stream, "ambient");
    } catch (err) {
      console.error("[sim] planWave failed", err);
    }
  }

  try {
    await flushDue(stream.id);
  } catch (err) {
    console.error("[sim] flush failed", err);
  }
  return nextAt;
}

export async function setSimulatorEnabled(stream: Stream, enabled: boolean, hostName: string) {
  await db
    .update(streams)
    .set({
      simEnabled: enabled,
      simNextAt: enabled ? sql`now() + make_interval(secs => ${nextWaveDelay(asPace(stream.simPace))})` : null,
    })
    .where(eq(streams.id, stream.id));

  if (enabled) {
    await planWave({ ...stream, simEnabled: true }, "arrival");
  } else {
    await db.delete(simQueue).where(eq(simQueue.streamId, stream.id));
  }
  void hostName;
}

export async function configureSimulator(
  stream: Stream,
  patch: { focus?: unknown; pace?: unknown; context?: unknown; transcript?: unknown },
) {
  const set: Partial<typeof streams.$inferInsert> = {};
  if (patch.focus !== undefined) set.simFocus = asFocus(patch.focus);
  if (patch.pace !== undefined) set.simPace = asPace(patch.pace);
  if (typeof patch.context === "string") set.simContext = patch.context.trim().slice(0, 600) || null;
  if (typeof patch.transcript === "string") {
    set.simTranscript = patch.transcript.trim().slice(-800) || null;
  }
  if (Object.keys(set).length === 0) return;
  await db.update(streams).set(set).where(eq(streams.id, stream.id));
}

export async function clearSimulated(stream: Stream) {
  const last = await db
    .select({ id: messages.id })
    .from(messages)
    .where(eq(messages.streamId, stream.id))
    .orderBy(desc(messages.id))
    .limit(1);
  const clearedAtId = last[0]?.id ?? 0;
  await db.delete(simQueue).where(eq(simQueue.streamId, stream.id));
  await db
    .delete(messages)
    .where(and(eq(messages.streamId, stream.id), eq(messages.origin, "sim")));
  const state = readState(stream);
  await db
    .update(streams)
    .set({ simCount: 0, simState: { ...state, clearedAtId } })
    .where(eq(streams.id, stream.id));
}

/** The host said something — let the simulated crowd respond to it. */
export async function onHostMessage(stream: Stream, body: string) {
  if (!stream.simEnabled) return;
  const cue = detectCue(body);
  try {
    await planWave(stream, cue ? "cue" : "reaction");
  } catch (err) {
    console.error("[sim] reaction failed", err);
  }
}

/** A real viewer said something — occasionally a simulated viewer replies. */
export async function onViewerMessage(stream: Stream, name: string, body: string) {
  if (!stream.simEnabled) return;
  const state = readState(stream);
  const now = Date.now();
  if (state.lastReplyAt && now - state.lastReplyAt < 90_000) return;
  if (Math.random() > 0.3) return;
  try {
    await planWave(stream, "reply", { replyTo: { name, body } });
    await db
      .update(streams)
      .set({ simState: { ...state, lastReplyAt: now } })
      .where(eq(streams.id, stream.id));
  } catch (err) {
    console.error("[sim] reply failed", err);
  }
}
