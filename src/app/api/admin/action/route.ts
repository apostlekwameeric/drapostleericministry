import { db } from "@/db";
import { messages, participants, streams, type DeviceCommand } from "@/db/schema";
import { isAdminRequest, setPin, unauthorized, verifyPin } from "@/lib/server/admin";
import { asMedia, findStream, systemMessage } from "@/lib/server/room";
import {
  clearSimulated,
  configureSimulator,
  planWave,
  setSimulatorEnabled,
} from "@/lib/server/simulator";
import { and, eq, sql } from "drizzle-orm";
import type { MediaKind } from "@/lib/types";

export const dynamic = "force-dynamic";

function fail(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}

async function hostOf(streamId: number) {
  const rows = await db
    .select()
    .from(participants)
    .where(and(eq(participants.streamId, streamId), eq(participants.role, "host")))
    .orderBy(participants.id)
    .limit(1);
  return rows[0] ?? null;
}

async function sendDeviceCommand(participantId: number, command: Omit<DeviceCommand, "issuedAt">) {
  await db
    .update(participants)
    .set({
      command: { ...command, issuedAt: Date.now() },
      commandSeq: sql`${participants.commandSeq} + 1`,
    })
    .where(eq(participants.id, participantId));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const passed =
    (typeof body.adminToken === "string" && body.adminToken) ||
    (typeof body.token === "string" && body.token) ||
    null;
  if (!(await isAdminRequest(passed))) return unauthorized();
  const action = String(body.action ?? "");

  /* ------------------------------------------------ actions without a room */

  if (action === "change-pin") {
    const current = typeof body.currentPin === "string" ? body.currentPin : "";
    const next = typeof body.newPin === "string" ? body.newPin : "";
    if (!(await verifyPin(current))) return fail("Current PIN is wrong", 403);
    try {
      await setPin(next);
    } catch (err) {
      return fail(err instanceof Error ? err.message : "Could not change PIN");
    }
    return Response.json({ ok: true });
  }

  if (action === "create-room") {
    const { createLiveRoom } = await import("@/lib/server/createRoom");
    const data = await createLiveRoom({
      hostName: body.hostName,
      title: body.title,
      mode: body.mode,
      tagline: body.tagline,
      scheduledFor: body.scheduledFor,
    });
    return Response.json({ ok: true, ...data });
  }

  /* ------------------------------------------------ room-scoped actions */

  const code = typeof body.code === "string" ? body.code : "";
  const stream = code ? await findStream(code) : null;
  if (!stream) return fail("Room not found", 404);

  switch (action) {
    /* ----- show / stream lifecycle ----- */
    case "start-stream": {
      if (stream.phase === "onair") return Response.json({ ok: true });
      const media: MediaKind = asMedia(body.media, stream.mode === "audio" ? "audio" : "video");
      await db
        .update(streams)
        .set({ phase: "onair", startedAt: sql`now()` })
        .where(eq(streams.id, stream.id));
      const host = await hostOf(stream.id);
      if (host) {
        await db
          .update(participants)
          .set({ media, micOn: true, camOn: media === "video", epoch: host.epoch + 1 })
          .where(eq(participants.id, host.id));
      }
      await systemMessage(stream.id, `🔴 ${stream.hostName} is now live`);
      return Response.json({ ok: true });
    }

    case "back-to-prelive": {
      await db.update(streams).set({ phase: "prelive" }).where(eq(streams.id, stream.id));
      const host = await hostOf(stream.id);
      if (host) {
        await db
          .update(participants)
          .set({ epoch: host.epoch + 1 })
          .where(eq(participants.id, host.id));
      }
      await systemMessage(stream.id, "⏸ The stream is on a short break — back shortly");
      return Response.json({ ok: true });
    }

    case "end-stream": {
      await db
        .update(streams)
        .set({ status: "ended", endedAt: sql`now()`, simEnabled: false, simNextAt: null })
        .where(eq(streams.id, stream.id));
      await systemMessage(stream.id, "The live has ended");
      return Response.json({ ok: true });
    }

    case "reopen-stream": {
      await db
        .update(streams)
        .set({ status: "live", endedAt: null, phase: "prelive" })
        .where(eq(streams.id, stream.id));
      await systemMessage(stream.id, "The room has been reopened");
      return Response.json({ ok: true });
    }

    case "update-show": {
      const title =
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim().slice(0, 80)
          : stream.title;
      const tagline =
        typeof body.tagline === "string" ? body.tagline.trim().slice(0, 120) || null : stream.tagline;
      const scheduledFor =
        typeof body.scheduledFor === "string"
          ? body.scheduledFor.trim().slice(0, 60) || null
          : stream.scheduledFor;
      const hostName =
        typeof body.hostName === "string" && body.hostName.trim()
          ? body.hostName.trim().slice(0, 32)
          : stream.hostName;
      await db
        .update(streams)
        .set({ title, tagline, scheduledFor, hostName })
        .where(eq(streams.id, stream.id));
      return Response.json({ ok: true });
    }

    /* ----- host device (camera / mic / light) ----- */
    case "device": {
      const host = await hostOf(stream.id);
      if (!host) return fail("The host is not connected right now", 409);
      const type = String(body.type ?? "");
      const command: Omit<DeviceCommand, "issuedAt"> | null =
        type === "flip"
          ? { type: "flip" }
          : type === "camera" && typeof body.deviceId === "string"
            ? { type: "camera", deviceId: body.deviceId }
            : type === "facing" && (body.facing === "user" || body.facing === "environment")
              ? { type: "camera", facing: body.facing }
              : type === "torch"
                ? { type: "torch", on: Boolean(body.on) }
                : type === "mic"
                  ? { type: "mic", on: Boolean(body.on) }
                  : type === "cam"
                    ? { type: "cam", on: Boolean(body.on) }
                    : type === "media" && (body.media === "video" || body.media === "audio")
                      ? { type: "media", media: body.media }
                      : null;
      if (!command) return fail("Unknown device command");

      // Mic/cam also flip the server-side flags immediately so badges update for viewers.
      if (command.type === "mic") {
        await db.update(participants).set({ micOn: Boolean(command.on) }).where(eq(participants.id, host.id));
      }
      if (command.type === "cam") {
        await db.update(participants).set({ camOn: Boolean(command.on) }).where(eq(participants.id, host.id));
      }
      if (command.type === "media" && command.media) {
        await db
          .update(participants)
          .set({ media: command.media, camOn: command.media === "video", micOn: true, epoch: host.epoch + 1 })
          .where(eq(participants.id, host.id));
      }
      await sendDeviceCommand(host.id, command);
      return Response.json({ ok: true });
    }

    /* ----- stage & people ----- */
    case "approve": {
      const targetId = Number(body.targetId);
      const rows = await db
        .select()
        .from(participants)
        .where(and(eq(participants.id, targetId), eq(participants.streamId, stream.id)))
        .limit(1);
      const target = rows[0];
      if (!target) return fail("No such participant", 404);
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
      return Response.json({ ok: true });
    }

    case "decline": {
      const targetId = Number(body.targetId);
      await db
        .update(participants)
        .set({ requestState: "denied", handRaised: false })
        .where(and(eq(participants.id, targetId), eq(participants.streamId, stream.id)));
      return Response.json({ ok: true });
    }

    case "invite": {
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
      await systemMessage(stream.id, `${target.name} has been invited on stage`);
      return Response.json({ ok: true });
    }

    case "remove-stage": {
      const targetId = Number(body.targetId);
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

    case "guest-mic": {
      const targetId = Number(body.targetId);
      await db
        .update(participants)
        .set({ micOn: Boolean(body.on) })
        .where(and(eq(participants.id, targetId), eq(participants.streamId, stream.id)));
      const rows = await db
        .select({ id: participants.id })
        .from(participants)
        .where(and(eq(participants.id, targetId), eq(participants.streamId, stream.id)))
        .limit(1);
      if (rows[0]) await sendDeviceCommand(rows[0].id, { type: "mic", on: Boolean(body.on) });
      return Response.json({ ok: true });
    }

    case "kick": {
      const targetId = Number(body.targetId);
      const rows = await db
        .select()
        .from(participants)
        .where(and(eq(participants.id, targetId), eq(participants.streamId, stream.id)))
        .limit(1);
      const target = rows[0];
      if (!target || target.role === "host") return fail("Cannot remove the host");
      await db
        .update(participants)
        .set({
          active: false,
          role: "viewer",
          media: "none",
          token: `revoked-${target.token}`,
          epoch: target.epoch + 1,
        })
        .where(eq(participants.id, target.id));
      await systemMessage(stream.id, `${target.name} was removed from the room`);
      return Response.json({ ok: true });
    }

    case "mute-chat": {
      const targetId = Number(body.targetId);
      await db
        .update(participants)
        .set({ muted: Boolean(body.on) })
        .where(and(eq(participants.id, targetId), eq(participants.streamId, stream.id)));
      return Response.json({ ok: true });
    }

    /* ----- chat ----- */
    case "announce": {
      const text = typeof body.body === "string" ? body.body.trim().slice(0, 400) : "";
      if (!text) return fail("Empty message");
      const asHost = Boolean(body.asHost);
      const host = asHost ? await hostOf(stream.id) : null;
      await db.insert(messages).values({
        streamId: stream.id,
        participantId: host?.id ?? null,
        name: host ? host.name : "📣 Admin",
        body: text,
        kind: host ? "chat" : "system",
        origin: "real",
        avatar: host ? `/api/avatar?s=p${host.id}&n=${encodeURIComponent(host.name.slice(0, 2))}` : null,
      });
      return Response.json({ ok: true });
    }

    case "delete-message": {
      const messageId = Number(body.messageId);
      await db
        .delete(messages)
        .where(and(eq(messages.id, messageId), eq(messages.streamId, stream.id)));
      return Response.json({ ok: true });
    }

    /* ----- simulated audience ----- */
    case "sim-toggle": {
      const enabled = Boolean(body.enabled);
      if (enabled !== stream.simEnabled) await setSimulatorEnabled(stream, enabled, "Admin");
      return Response.json({ ok: true });
    }
    case "sim-config": {
      await configureSimulator(stream, {
        focus: body.focus,
        pace: body.pace,
        context: body.context,
        transcript: body.transcript,
      });
      return Response.json({ ok: true });
    }
    case "sim-burst": {
      if (!stream.simEnabled) return fail("Start the audience first");
      const queued = await planWave(stream, "ambient", { count: 3 });
      return Response.json({ ok: true, queued });
    }
    case "sim-clear": {
      await clearSimulated(stream);
      return Response.json({ ok: true });
    }

    /* ----- host handoff: open the room as host on this device ----- */
    case "host-token": {
      const host = await hostOf(stream.id);
      if (!host) return fail("No host record for this room", 404);
      return Response.json({
        ok: true,
        identity: {
          code: stream.code,
          participantId: host.id,
          token: host.token,
          name: host.name,
          role: "host",
        },
      });
    }

    default:
      return fail(`Unknown action: ${action}`);
  }
}
