import { db } from "@/db";
import { messages, participants, signals, streams } from "@/db/schema";
import {
  asMedia,
  authenticate,
  avatarFor,
  systemMessage,
} from "@/lib/server/room";
import {
  clearSimulated,
  configureSimulator,
  onHostMessage,
  onViewerMessage,
  planWave,
  setSimulatorEnabled,
} from "@/lib/server/simulator";
import type { MediaKind, SignalKind } from "@/lib/types";
import { and, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const SIGNAL_KINDS: SignalKind[] = ["offer", "answer", "ice", "bye"];

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
  const action = String(body.action ?? "");
  const isHost = me.role === "host";

  switch (action) {
    case "chat": {
      const text = typeof body.body === "string" ? body.body.trim().slice(0, 400) : "";
      if (!text) return Response.json({ ok: false, error: "Empty message" });
      if (me.muted) return Response.json({ ok: false, error: "You have been muted in chat" });
      await db.insert(messages).values({
        streamId: stream.id,
        participantId: me.id,
        name: me.name,
        body: text,
        kind: "chat",
        origin: "real",
        avatar: avatarFor(me.id, me.name, me.photoVersion ?? 0),
      });
      if (stream.simEnabled) {
        if (isHost) await onHostMessage(stream, text);
        else await onViewerMessage(stream, me.name, text);
      }
      return Response.json({ ok: true });
    }

    case "reaction": {
      const emoji = typeof body.emoji === "string" ? body.emoji.slice(0, 8) : "❤️";
      await db.insert(messages).values({
        streamId: stream.id,
        participantId: me.id,
        name: me.name,
        body: emoji,
        kind: "reaction",
        origin: "real",
        avatar: avatarFor(me.id, me.name, me.photoVersion ?? 0),
      });
      return Response.json({ ok: true });
    }

    case "sim-toggle": {
      if (!isHost) return Response.json({ error: "Host only" }, { status: 403 });
      const enabled = Boolean(body.enabled);
      if (enabled !== stream.simEnabled) {
        await setSimulatorEnabled(stream, enabled, me.name);
      }
      return Response.json({ ok: true, enabled });
    }

    case "sim-config": {
      if (!isHost) return Response.json({ error: "Host only" }, { status: 403 });
      await configureSimulator(stream, {
        focus: body.focus,
        pace: body.pace,
        context: body.context,
        transcript: body.transcript,
      });
      return Response.json({ ok: true });
    }

    case "sim-burst": {
      if (!isHost) return Response.json({ error: "Host only" }, { status: 403 });
      if (!stream.simEnabled) return Response.json({ ok: false, error: "Start the audience first" });
      const sent = await planWave(stream, "ambient", { count: 3 });
      return Response.json({ ok: true, queued: sent });
    }

    case "sim-clear": {
      if (!isHost) return Response.json({ error: "Host only" }, { status: 403 });
      await clearSimulated(stream);
      return Response.json({ ok: true });
    }

    case "signal": {
      const list = Array.isArray(body.signals) ? body.signals : [];
      const rows = list
        .map((raw) => raw as Record<string, unknown>)
        .filter((raw) => SIGNAL_KINDS.includes(String(raw.kind) as SignalKind))
        .slice(0, 40)
        .map((raw) => ({
          streamId: stream.id,
          fromId: me.id,
          toId: Number(raw.toId),
          kind: String(raw.kind),
          epoch: Number(raw.epoch ?? 1) || 1,
          payload: (raw.payload ?? {}) as object,
        }))
        .filter((row) => Number.isFinite(row.toId) && row.toId > 0);
      if (rows.length > 0) await db.insert(signals).values(rows);
      return Response.json({ ok: true, sent: rows.length });
    }

    case "request-stage": {
      if (me.role !== "viewer") return Response.json({ ok: true });
      const media: MediaKind = asMedia(body.media, "audio");
      await db
        .update(participants)
        .set({ requestState: "pending", requestedMedia: media, handRaised: true })
        .where(eq(participants.id, me.id));
      await systemMessage(
        stream.id,
        `${me.name} asked to join with ${media === "video" ? "video" : "audio"}`,
      );
      return Response.json({ ok: true });
    }

    case "start-stream": {
      if (!isHost) return Response.json({ error: "Host only" }, { status: 403 });
      if (stream.phase === "onair") return Response.json({ ok: true });
      const media: MediaKind = asMedia(body.media, stream.mode === "audio" ? "audio" : "video");
      await db
        .update(streams)
        .set({ phase: "onair", startedAt: sql`now()` })
        .where(eq(streams.id, stream.id));
      await db
        .update(participants)
        .set({
          media,
          micOn: true,
          camOn: media === "video",
          epoch: me.epoch + 1,
        })
        .where(eq(participants.id, me.id));
      await systemMessage(stream.id, `🔴 ${me.name} is now live`);
      return Response.json({ ok: true });
    }

    case "update-show": {
      if (!isHost) return Response.json({ error: "Host only" }, { status: 403 });
      const title =
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim().slice(0, 80)
          : stream.title;
      const tagline =
        typeof body.tagline === "string"
          ? body.tagline.trim().slice(0, 120) || null
          : stream.tagline;
      const scheduledFor =
        typeof body.scheduledFor === "string"
          ? body.scheduledFor.trim().slice(0, 60) || null
          : stream.scheduledFor;
      await db
        .update(streams)
        .set({ title, tagline, scheduledFor })
        .where(eq(streams.id, stream.id));
      return Response.json({ ok: true });
    }

    case "invite": {
      if (!isHost) return Response.json({ error: "Host only" }, { status: 403 });
      const targetId = Number(body.targetId);
      const rows = await db
        .select()
        .from(participants)
        .where(and(eq(participants.id, targetId), eq(participants.streamId, stream.id)))
        .limit(1);
      const target = rows[0];
      if (!target || target.role !== "viewer") return Response.json({ ok: true });
      await db
        .update(participants)
        .set({ requestState: "invited" })
        .where(eq(participants.id, target.id));
      await systemMessage(stream.id, `${me.name} invited ${target.name} on stage`);
      return Response.json({ ok: true });
    }

    case "accept-invite": {
      if (me.requestState !== "invited") {
        return Response.json({ error: "No pending invite" }, { status: 409 });
      }
      const media: MediaKind = asMedia(body.media, "audio");
      await db
        .update(participants)
        .set({
          role: "guest",
          media,
          micOn: true,
          camOn: media === "video",
          requestState: "none",
          handRaised: false,
          epoch: me.epoch + 1,
        })
        .where(eq(participants.id, me.id));
      await systemMessage(stream.id, `${me.name} joined the stage`);
      return Response.json({ ok: true });
    }

    case "cancel-request": {
      await db
        .update(participants)
        .set({ requestState: "none", handRaised: false })
        .where(eq(participants.id, me.id));
      return Response.json({ ok: true });
    }

    case "decide": {
      if (!isHost) return Response.json({ error: "Host only" }, { status: 403 });
      const targetId = Number(body.targetId);
      const approve = Boolean(body.approve);
      const rows = await db
        .select()
        .from(participants)
        .where(and(eq(participants.id, targetId), eq(participants.streamId, stream.id)))
        .limit(1);
      const target = rows[0];
      if (!target) return Response.json({ error: "No such guest" }, { status: 404 });

      if (approve) {
        const media = asMedia(body.media, asMedia(target.requestedMedia, "audio"));
        await db
          .update(participants)
          .set({
            role: "guest",
            media,
            micOn: true,
            camOn: media === "video",
            requestState: "none",
            handRaised: false,
            epoch: target.epoch + 1,
          })
          .where(eq(participants.id, target.id));
        await systemMessage(stream.id, `${target.name} is now on stage`);
      } else {
        await db
          .update(participants)
          .set({ requestState: "denied", handRaised: false })
          .where(eq(participants.id, target.id));
      }
      return Response.json({ ok: true });
    }

    case "remove-stage": {
      const targetId = Number(body.targetId);
      if (!isHost && targetId !== me.id) {
        return Response.json({ error: "Host only" }, { status: 403 });
      }
      const rows = await db
        .select()
        .from(participants)
        .where(and(eq(participants.id, targetId), eq(participants.streamId, stream.id)))
        .limit(1);
      const target = rows[0];
      if (!target || target.role === "host") return Response.json({ ok: true });
      await db
        .update(participants)
        .set({
          role: "viewer",
          media: "none",
          micOn: false,
          camOn: false,
          requestState: "none",
          handRaised: false,
          epoch: target.epoch + 1,
        })
        .where(eq(participants.id, target.id));
      await systemMessage(stream.id, `${target.name} left the stage`);
      return Response.json({ ok: true });
    }

    case "set-media": {
      const media = asMedia(body.media, me.media as MediaKind);
      if (me.role === "viewer") return Response.json({ ok: true });
      await db
        .update(participants)
        .set({
          media,
          camOn: media === "video",
          micOn: true,
          epoch: me.epoch + 1,
        })
        .where(eq(participants.id, me.id));
      return Response.json({ ok: true });
    }

    case "toggle": {
      const micOn = typeof body.micOn === "boolean" ? body.micOn : me.micOn;
      const camOn = typeof body.camOn === "boolean" ? body.camOn : me.camOn;
      await db
        .update(participants)
        .set({ micOn, camOn })
        .where(eq(participants.id, me.id));
      return Response.json({ ok: true });
    }

    case "leave": {
      await db
        .update(participants)
        .set({ active: false, handRaised: false, requestState: "none" })
        .where(eq(participants.id, me.id));
      if (isHost) {
        await db
          .update(streams)
          .set({ status: "ended", endedAt: sql`now()` })
          .where(eq(streams.id, stream.id));
        await systemMessage(stream.id, "The live has ended");
      }
      return Response.json({ ok: true });
    }

    case "end": {
      if (!isHost) return Response.json({ error: "Host only" }, { status: 403 });
      await db
        .update(streams)
        .set({ status: "ended", endedAt: sql`now()` })
        .where(eq(streams.id, stream.id));
      await systemMessage(stream.id, "The live has ended");
      return Response.json({ ok: true });
    }

    default:
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
