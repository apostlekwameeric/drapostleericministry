import { db } from "@/db";
import { messages, participants, streams } from "@/db/schema";
import { ensureSchema } from "@/lib/server/ensureSchema";
import type {
  MediaKind,
  PublicMessage,
  PublicParticipant,
  Role,
  StreamSummary,
} from "@/lib/types";
import { and, eq, gt, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

/** Participants that have not sent a heartbeat within this window are hidden. */
export const PRESENCE_WINDOW_MS = 20_000;

const CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function makeCode(length = 7) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export function makeToken() {
  return randomUUID();
}

export function sanitizeName(raw: unknown, fallback = "Guest") {
  const value = typeof raw === "string" ? raw.trim().slice(0, 32) : "";
  return value.length > 0 ? value : `${fallback}-${Math.floor(Math.random() * 900 + 100)}`;
}

export function asMedia(raw: unknown, fallback: MediaKind = "none"): MediaKind {
  return raw === "video" || raw === "audio" || raw === "none" ? raw : fallback;
}

export async function findStream(code: string) {
  try {
    await ensureSchema();
    const rows = await db
      .select()
      .from(streams)
      .where(eq(streams.code, code.toLowerCase()))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function authenticate(code: string, token: unknown) {
  if (typeof token !== "string" || token.length < 8) return null;
  const stream = await findStream(code);
  if (!stream) return null;
  const rows = await db
    .select()
    .from(participants)
    .where(and(eq(participants.token, token), eq(participants.streamId, stream.id)))
    .limit(1);
  const me = rows[0];
  if (!me) return null;
  return { stream, me };
}

export function toPublicParticipant(row: {
  id: number;
  name: string;
  role: string;
  media: string;
  epoch: number;
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  requestState: string;
  requestedMedia: string;
}): PublicParticipant {
  return {
    id: row.id,
    name: row.name,
    role: (row.role as Role) ?? "viewer",
    media: asMedia(row.media),
    epoch: row.epoch,
    micOn: row.micOn,
    camOn: row.camOn,
    handRaised: row.handRaised,
    requestState:
      row.requestState === "pending" ||
      row.requestState === "denied" ||
      row.requestState === "invited"
        ? row.requestState
        : "none",
    requestedMedia: asMedia(row.requestedMedia),
  };
}

export function avatarFor(
  participantId: number,
  name: string,
  photoVersion = 0,
) {
  if (photoVersion > 0) return `/api/people/${participantId}/photo?v=${photoVersion}`;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return `/api/avatar?s=p${participantId}&n=${encodeURIComponent(initials || "?")}`;
}

export function toPublicMessage(row: {
  id: number;
  name: string;
  body: string;
  kind: string;
  participantId: number | null;
  origin?: string | null;
  avatar?: string | null;
  meta?: { flag?: string; country?: string } | null;
  createdAt: Date;
}): PublicMessage {
  return {
    id: row.id,
    name: row.name,
    body: row.body,
    kind: row.kind === "system" || row.kind === "reaction" ? row.kind : "chat",
    participantId: row.participantId,
    origin: row.origin === "sim" ? "sim" : "real",
    avatar:
      row.avatar ??
      (row.participantId && row.kind !== "system" ? avatarFor(row.participantId, row.name) : null),
    flag: row.meta?.flag ?? null,
    country: row.meta?.country ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function activeParticipants(streamId: number) {
  const cutoff = new Date(Date.now() - PRESENCE_WINDOW_MS);
  const rows = await db
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.streamId, streamId),
        eq(participants.active, true),
        gt(participants.lastSeenAt, cutoff),
      ),
    )
    .orderBy(participants.id);
  return rows;
}

export async function recentMessages(streamId: number, sinceId: number, limit = 500) {
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.streamId, streamId), gt(messages.id, sinceId)))
    .orderBy(messages.id)
    .limit(limit);
  return rows.map(toPublicMessage);
}

export async function systemMessage(streamId: number, body: string) {
  await db.insert(messages).values({
    streamId,
    participantId: null,
    name: "system",
    body,
    kind: "system",
  });
}

export function summarize(
  stream: {
    code: string;
    title: string;
    hostName: string;
    mode: string;
    status: string;
    phase: string;
    tagline: string | null;
    scheduledFor: string | null;
    coverVersion: number;
    createdAt: Date;
    startedAt: Date | null;
    simEnabled: boolean;
    simFocus: string;
    simPace: string;
    simContext: string | null;
    simNextAt: Date | null;
    simCount: number;
    simState: { clearedAtId?: number } | null;
  },
  people: { role: string }[],
  overrides: { simNextAt?: Date | null } = {},
): StreamSummary {
  const onStage = people.filter((p) => p.role === "host" || p.role === "guest").length;
  return {
    code: stream.code,
    title: stream.title,
    hostName: stream.hostName,
    mode: stream.mode === "audio" ? "audio" : "video",
    status: stream.status === "ended" ? "ended" : "live",
    phase: stream.phase === "onair" ? "onair" : "prelive",
    tagline: stream.tagline,
    scheduledFor: stream.scheduledFor,
    coverVersion: stream.coverVersion,
    hasCover: stream.coverVersion > 0,
    viewers: people.length,
    onStage,
    createdAt: stream.createdAt.toISOString(),
    startedAt: stream.startedAt ? stream.startedAt.toISOString() : null,
    sim: {
      enabled: stream.simEnabled,
      focus: (["auto", "blessing", "healing", "miracle", "offering", "prayer"].includes(stream.simFocus)
        ? stream.simFocus
        : "auto") as StreamSummary["sim"]["focus"],
      pace: (["calm", "normal", "lively"].includes(stream.simPace)
        ? stream.simPace
        : "normal") as StreamSummary["sim"]["pace"],
      context: stream.simContext,
      nextAt: (overrides.simNextAt !== undefined ? overrides.simNextAt : stream.simNextAt)?.toISOString() ?? null,
      count: stream.simCount,
      clearedAtId: stream.simState?.clearedAtId ?? 0,
    },
  };
}

export async function touch(participantId: number) {
  await db
    .update(participants)
    .set({ lastSeenAt: sql`now()` })
    .where(eq(participants.id, participantId));
}
