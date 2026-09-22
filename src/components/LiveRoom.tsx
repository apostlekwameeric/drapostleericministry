"use client";

import BrandMark from "@/components/BrandMark";
import ChatPanel from "@/components/ChatPanel";
import OfferingButton from "@/components/OfferingButton";
import SlideComments from "@/components/SlideComments";
import ProfilePhotoButton from "@/components/ProfilePhotoButton";
import { prepareImage, uploadImage } from "@/lib/clientImage";
import PreLiveStage from "@/components/PreLiveStage";
import ShareSheet from "@/components/ShareSheet";
import VideoTile from "@/components/VideoTile";
import { loadIdentity, recallName, rememberName, saveIdentity } from "@/lib/identity";
import type { Identity, MediaKind, PublicParticipant, StreamSummary } from "@/lib/types";
import { useBrand, type BrandInfo } from "@/lib/useBrand";
import { useLiveRoom } from "@/lib/useLiveRoom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  code: string;
  initialStream: StreamSummary | null;
  initialBrand: BrandInfo;
};

export default function LiveRoom({ code, initialStream, initialBrand }: Props) {
  const router = useRouter();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = loadIdentity(code);
    queueMicrotask(() => {
      setIdentity(stored);
      setChecked(true);
    });
  }, [code]);

  if (!checked) {
    return (
      <main className="flex h-dvh items-center justify-center bg-black text-white/60">
        Loading…
      </main>
    );
  }

  if (!identity) {
    return (
      <JoinGate
        code={code}
        initialStream={initialStream}
        initialBrand={initialBrand}
        onJoined={(id) => {
          saveIdentity(id);
          setIdentity(id);
        }}
        onMissing={() => router.push("/")}
      />
    );
  }

  return <Room identity={identity} initialBrand={initialBrand} />;
}

/* ------------------------------------------------------------------ gate */

function JoinGate({
  code,
  initialStream,
  initialBrand,
  onJoined,
  onMissing,
}: {
  code: string;
  initialStream: StreamSummary | null;
  initialBrand: BrandInfo;
  onJoined: (id: Identity) => void;
  onMissing: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const { brand } = useBrand(initialBrand);

  useEffect(() => {
    const stored = recallName();
    if (stored) queueMicrotask(() => setName(stored));
  }, []);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/streams/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as Identity & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not join this live.");
        setBusy(false);
        return;
      }
      rememberName(data.name);
      if (photoBlob) {
        try {
          await uploadImage(
            `/api/streams/${data.code}/photo`,
            photoBlob,
            { token: data.token },
            "photo",
          );
        } catch {
          /* join succeeded even if the photo did not */
        }
      }
      onJoined({
        code: data.code,
        participantId: data.participantId,
        token: data.token,
        name: data.name,
        role: data.role,
      });
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  };

  return (
    <main className="flex h-dvh items-center justify-center bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-6 text-white">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <BrandMark brand={brand} size="md" className="mb-4" />
        {initialStream?.hasCover && (
          <div className="mb-4 overflow-hidden rounded-2xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/streams/${code}/cover?v=${initialStream.coverVersion}`}
              alt="Program banner"
              className="w-full object-cover"
            />
          </div>
        )}
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              initialStream?.phase === "onair" ? "pulse-ring bg-rose-600" : "bg-violet-600"
            }`}
          >
            {initialStream?.phase === "onair" ? "live" : "starting soon"}
          </span>
          <span className="text-xs text-white/50">#{code}</span>
        </div>
        <h1 className="text-xl font-bold">
          {initialStream?.title ?? "Join the live room"}
        </h1>
        <p className="mt-1 text-sm text-white/60">
          {initialStream
            ? initialStream.phase === "onair"
              ? `${initialStream.hostName} is live · ${initialStream.viewers} watching`
              : `${initialStream.hostName} · ${
                  initialStream.scheduledFor ?? "starting soon"
                } · ${initialStream.viewers} waiting`
            : "Enter a display name to join the conversation."}
        </p>

        {initialStream?.status === "ended" ? (
          <div className="mt-6 space-y-3">
            <p className="rounded-xl bg-rose-500/15 p-3 text-sm text-rose-200">
              This live has already ended.
            </p>
            <button
              onClick={onMissing}
              className="w-full rounded-full bg-white/10 py-3 text-sm font-semibold"
            >
              Back to home
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                void (async () => {
                  try {
                    const prepared = await prepareImage(file, { maxEdge: 512, preferJpeg: true });
                    setPhotoPreview(prepared.previewUrl);
                    setPhotoBlob(prepared.blob);
                  } catch {
                    setError("Could not read that photo.");
                  }
                })();
              }}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 via-fuchsia-500 to-rose-500 text-lg font-black"
                title="Add a profile photo"
              >
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  "📷"
                )}
              </button>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
              >
                {photoPreview ? "Change photo" : "Add profile photo (optional)"}
              </button>
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              maxLength={32}
              className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm outline-none focus:border-fuchsia-400"
            />
            {error && <p className="text-xs text-rose-300">{error}</p>}
            <button
              onClick={join}
              disabled={busy}
              className="w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 py-3 text-sm font-bold disabled:opacity-50"
            >
              {busy ? "Joining…" : "Join live"}
            </button>
            <p className="text-center text-[11px] text-white/40">
              You join as a viewer. You can ask the host to bring you on with audio or
              video.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ room */

function Room({
  identity,
  initialBrand,
}: {
  identity: Identity;
  initialBrand: BrandInfo;
}) {
  const router = useRouter();
  const room = useLiveRoom(identity);
  const { brand } = useBrand(initialBrand);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [coverNonce, setCoverNonce] = useState(0);
  const [floaters, setFloaters] = useState<{ id: number; emoji: string; left: number }[]>(
    [],
  );
  const seenReactions = useRef(0);
  const autoShared = useRef(false);

  const stage = useMemo(
    () =>
      room.participants
        .filter((p) => p.role === "host" || p.role === "guest")
        .sort((a, b) => (a.role === "host" ? -1 : b.role === "host" ? 1 : a.id - b.id)),
    [room.participants],
  );
  const requests = useMemo(
    () => room.participants.filter((p) => p.requestState === "pending"),
    [room.participants],
  );

  const sim = room.stream?.sim;
  const clearedAtId = sim?.clearedAtId ?? 0;
  const visibleMessages = useMemo(
    () =>
      clearedAtId > 0
        ? room.messages.filter((m) => !(m.origin === "sim" && m.id <= clearedAtId))
        : room.messages,
    [room.messages, clearedAtId],
  );

  const me = room.me;
  const isHost = me?.role === "host";
  const iAmOnStage = me?.role === "host" || me?.role === "guest";
  const ended = room.stream?.status === "ended";
  const prelive = room.stream?.phase !== "onair" && !ended;

  useEffect(() => {
    const reactions = room.messages.filter((m) => m.kind === "reaction");
    if (reactions.length <= seenReactions.current) {
      seenReactions.current = reactions.length;
      return;
    }
    const fresh = reactions.slice(seenReactions.current);
    seenReactions.current = reactions.length;
    setFloaters((prev) => [
      ...prev.slice(-12),
      ...fresh.map((m) => ({
        id: m.id,
        emoji: m.body,
        left: 10 + Math.random() * 70,
      })),
    ]);
  }, [room.messages]);

  // Nudge the host to invite people as soon as their live is up.
  useEffect(() => {
    if (autoShared.current || room.me?.role !== "host") return;
    autoShared.current = true;
    const t = setTimeout(() => setInviteOpen(true), 900);
    return () => clearTimeout(t);
  }, [room.me?.role]);

  useEffect(() => {
    if (floaters.length === 0) return;
    const t = setTimeout(() => setFloaters((prev) => prev.slice(1)), 3000);
    return () => clearTimeout(t);
  }, [floaters]);

  const coverSrc = room.stream?.hasCover
    ? `/api/streams/${identity.code}/cover?v=${room.stream.coverVersion}-${coverNonce}`
    : null;

  const exit = async () => {
    await room.leave();
    router.push("/");
  };

  if (room.fatal) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-4 bg-black text-white">
        <p className="text-white/70">{room.fatal}</p>
        <Link href="/" className="rounded-full bg-white/10 px-5 py-2 text-sm">
          Back home
        </Link>
      </main>
    );
  }

  const tileFor = (p: PublicParticipant) => {
    const isLocal = p.id === identity.participantId;
    return (
      <VideoTile
        key={p.id}
        participant={p}
        stream={isLocal ? room.localStream : (room.remoteStreams[p.id] ?? null)}
        isLocal={isLocal}
        connection={room.connections[p.id]}
        featured={stage.length === 1}
        onKick={isHost && !isLocal ? () => room.removeFromStage(p.id) : undefined}
      />
    );
  };

  const peopleList = (
    <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
      {room.participants.map((p) => (
        <li key={p.id} className="flex items-center gap-2 text-white/70">
          <span className="truncate">
            {p.role === "host" ? "👑" : p.role === "guest" ? "🎤" : "👀"} {p.name}
            {p.id === identity.participantId ? " (you)" : ""}
          </span>
          {p.handRaised && <span className="text-amber-300">✋</span>}
          {isHost && p.role === "viewer" && p.requestState !== "pending" && (
            <button
              onClick={() => room.inviteToStage(p.id)}
              className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-200 hover:bg-white/20"
            >
              {p.requestState === "invited" ? "invited" : "invite up"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <main className="flex h-dvh w-full flex-col bg-black text-white lg:flex-row">
      <section className="relative flex min-h-0 flex-1 flex-col">
        {/* top bar */}
        <header className="flex items-center gap-2 px-3 py-3">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              ended
                ? "bg-white/15"
                : prelive
                  ? "bg-violet-600"
                  : "pulse-ring bg-rose-600"
            }`}
          >
            {ended ? "ended" : prelive ? "soon" : "live"}
          </span>
          <BrandMark brand={brand} size="sm" showText={false} />
          <ProfilePhotoButton
            code={identity.code}
            token={identity.token}
            name={identity.name}
            size="sm"
            currentUrl={`/api/people/${identity.participantId}/photo`}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {room.stream?.title ?? "Live room"}
            </p>
            <p className="truncate text-[11px] text-white/50">
              {room.stream?.hostName} · {room.stream?.viewers ?? 0}{" "}
              {prelive ? "waiting" : "watching"}
              {!prelive && ` · ${stage.length} on stage`}
            </p>
          </div>
          <button
            onClick={() => setPeopleOpen((v) => !v)}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 lg:hidden"
          >
            👥 {room.participants.length}
          </button>
          <button
            onClick={exit}
            className="rounded-full bg-rose-600/90 px-3 py-1.5 text-xs font-semibold hover:bg-rose-600"
          >
            {isHost ? "End" : "Leave"}
          </button>
        </header>

        {/* stage */}
        <div className="relative min-h-0 flex-1 px-3 pb-3">
          {prelive && room.stream ? (
            <PreLiveStage
              stream={room.stream}
              code={identity.code}
              token={identity.token}
              isHost={isHost}
              onCoverChanged={() => setCoverNonce((n) => n + 1)}
              onStart={(media) => room.startStream(media)}
              onUpdateShow={(patch) => room.updateShow(patch)}
              onShare={() => setInviteOpen(true)}
              onPickFacing={(facing) => void room.selectCamera({ facing })}
            />
          ) : stage.length === 0 ? (
            <div className="relative flex h-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 text-sm text-white/50">
              {coverSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverSrc}
                  alt="Program banner"
                  className="absolute inset-0 h-full w-full object-cover opacity-40"
                />
              )}
              <span className="relative rounded-full bg-black/70 px-4 py-2">
                Waiting for the host to come back…
              </span>
            </div>
          ) : stage.length === 1 ? (
            <div className="h-full">{tileFor(stage[0])}</div>
          ) : (
            <div className="grid h-full grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {stage.map((p) => tileFor(p))}
            </div>
          )}

          {/* floating reactions */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {floaters.map((f) => (
              <span
                key={`${f.id}-${f.left}`}
                className="float-up absolute bottom-24 text-3xl"
                style={{ left: `${f.left}%` }}
              >
                {f.emoji}
              </span>
            ))}
          </div>

          {/* host request tray */}
          {isHost && requests.length > 0 && (
            <div className="absolute right-4 top-2 w-64 space-y-2 rounded-2xl border border-white/15 bg-black/80 p-3 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-wider text-fuchsia-300">
                Join requests
              </p>
              {requests.map((r) => (
                <div key={r.id} className="rounded-xl bg-white/5 p-2">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-[11px] text-white/50">
                    wants to join with {r.requestedMedia}
                  </p>
                  <div className="mt-2 flex gap-1">
                    <button
                      onClick={() => room.decide(r.id, true, r.requestedMedia)}
                      className="flex-1 rounded-full bg-emerald-500 px-2 py-1 text-[11px] font-bold text-black"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => room.decide(r.id, true, "audio")}
                      className="rounded-full bg-white/15 px-2 py-1 text-[11px] font-semibold"
                    >
                      🎙️
                    </button>
                    <button
                      onClick={() => room.decide(r.id, false)}
                      className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-rose-300"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {room.mediaError && (
            <div className="absolute inset-x-4 top-2 rounded-xl bg-amber-500/20 p-3 text-xs text-amber-100">
              {room.mediaError}
            </div>
          )}

          {ended && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/80">
              <p className="text-lg font-bold">This live has ended</p>
              <Link
                href="/"
                className="rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-5 py-2 text-sm font-semibold"
              >
                Discover more lives
              </Link>
            </div>
          )}

          {peopleOpen && (
            <div className="absolute left-3 right-3 top-2 z-20 rounded-2xl border border-white/15 bg-black/90 p-3 backdrop-blur lg:hidden">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                  In the room ({room.participants.length})
                </p>
                <button
                  onClick={() => setPeopleOpen(false)}
                  className="text-xs text-white/50"
                >
                  close
                </button>
              </div>
              {peopleList}
            </div>
          )}

          <SlideComments>
            <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-4">
              <ChatPanel
                variant="overlay"
                messages={visibleMessages}
                myId={identity.participantId}
                onSend={room.sendChat}
                onReact={room.sendReaction}
              />
            </div>
          </SlideComments>
        </div>

        {/* controls — host camera/mic/light/audience live only in the admin dashboard */}
        <div className="border-t border-white/10 bg-black/80 px-3 py-3">
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-4 py-2 text-xs font-bold"
            >
              📤 Share
            </button>
            <OfferingButton code={identity.code} defaultName={identity.name} />
          </div>
          {prelive ? (
            <p className="text-center text-xs text-white/50">
              {isHost
                ? "Upload your banner, then hit “Go live” when you are ready. Camera, mic and audience are controlled from Admin."
                : "The show has not started — comments are open while you wait."}
            </p>
          ) : isHost ? (
            <p className="text-center text-xs text-white/50">
              You are hosting. Mic, camera, flip, light and audience are controlled from the{" "}
              <a href="/admin" className="font-semibold text-fuchsia-300 underline">
                Admin dashboard
              </a>
              .
            </p>
          ) : iAmOnStage ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => room.removeFromStage(identity.participantId)}
                className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-rose-300"
              >
                Leave stage
              </button>
              <span className="ml-auto text-[11px] text-white/40">You are on stage</span>
            </div>
          ) : (
            <ViewerControls
              me={me}
              onRequest={room.requestStage}
              onCancel={room.cancelRequest}
              onAcceptInvite={room.acceptInvite}
              disabled={ended}
            />
          )}
        </div>
      </section>

      {/* desktop chat */}
      <aside className="hidden min-h-0 w-[240px] flex-col border-l border-white/10 bg-zinc-950 lg:flex">
        <div className="px-4 py-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
            In the room ({room.participants.length})
          </p>
          {peopleList}
        </div>
      </aside>

      <ShareSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        code={identity.code}
        title={room.stream?.title ?? "Join my live"}
        hostName={room.stream?.hostName ?? identity.name}
        mode={room.stream?.mode ?? "video"}
        coverVersion={(room.stream?.coverVersion ?? 0) + coverNonce}
      />
    </main>
  );
}

function ViewerControls({
  me,
  onRequest,
  onCancel,
  onAcceptInvite,
  disabled,
}: {
  me: PublicParticipant | null;
  onRequest: (media: MediaKind) => void;
  onCancel: () => void;
  onAcceptInvite: (media: MediaKind) => void;
  disabled: boolean;
}) {
  if (me?.requestState === "invited") {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-fuchsia-500/15 p-2">
        <span className="text-xs font-semibold text-fuchsia-200">
          🎉 The host invited you on stage!
        </span>
        <button
          onClick={() => onAcceptInvite("audio")}
          className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold"
        >
          🎙️ Join with audio
        </button>
        <button
          onClick={() => onAcceptInvite("video")}
          className="rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-4 py-2 text-xs font-bold"
        >
          📹 Join with video
        </button>
        <button
          onClick={onCancel}
          className="ml-auto rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/60"
        >
          Not now
        </button>
      </div>
    );
  }

  if (me?.requestState === "pending") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-amber-200">
          ✋ Waiting for the host to accept you ({me.requestedMedia})…
        </span>
        <button
          onClick={onCancel}
          className="ml-auto rounded-full bg-white/10 px-4 py-2 text-xs font-semibold"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-white/50">
        {me?.requestState === "denied"
          ? "Host declined for now — you can ask again."
          : "Want to join the live?"}
      </span>
      <button
        onClick={() => onRequest("audio")}
        disabled={disabled}
        className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold disabled:opacity-40"
      >
        🎙️ Join with audio
      </button>
      <button
        onClick={() => onRequest("video")}
        disabled={disabled}
        className="rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-4 py-2 text-xs font-bold disabled:opacity-40"
      >
        📹 Join with video
      </button>
    </div>
  );
}
