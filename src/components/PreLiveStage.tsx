"use client";

import BrandMark from "@/components/BrandMark";
import CoverUploader from "@/components/CoverUploader";
import type { StreamSummary } from "@/lib/types";
import { useBrand } from "@/lib/useBrand";
import type { Facing } from "@/lib/useLiveRoom";
import { useEffect, useState } from "react";

type Props = {
  stream: StreamSummary;
  code: string;
  token: string;
  isHost: boolean;
  onCoverChanged: () => void;
  onStart: (media: "video" | "audio") => void;
  onUpdateShow: (patch: { title?: string; tagline?: string; scheduledFor?: string }) => void;
  onShare: () => void;
  onPickFacing: (facing: Facing) => void;
};

function elapsed(from: string) {
  const ms = Date.now() - new Date(from).getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function PreLiveStage({
  stream,
  code,
  token,
  isHost,
  onCoverChanged,
  onStart,
  onUpdateShow,
  onShare,
  onPickFacing,
}: Props) {
  const { brand } = useBrand();
  const [facing, setFacing] = useState<Facing>("user");
  const [waiting, setWaiting] = useState("0:00");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(stream.title);
  const [tagline, setTagline] = useState(stream.tagline ?? "");
  const [scheduledFor, setScheduledFor] = useState(stream.scheduledFor ?? "");

  useEffect(() => {
    const update = () => setWaiting(elapsed(stream.createdAt));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [stream.createdAt]);

  const coverSrc = stream.hasCover
    ? `/api/streams/${code}/cover?v=${stream.coverVersion}`
    : null;

  const saveShow = () => {
    onUpdateShow({ title, tagline, scheduledFor });
    setEditing(false);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
      {coverSrc ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverSrc}
            alt="Program banner"
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-60"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverSrc}
            alt="Program banner"
            className="absolute inset-0 h-full w-full object-contain"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(217,70,239,0.35),transparent_55%),radial-gradient(circle_at_75%_80%,rgba(244,63,94,0.3),transparent_55%)]" />
      )}

      <div className="relative flex h-full flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center">
        <BrandMark brand={brand} size="md" className="justify-center" />
        <span className="rounded-full bg-violet-600 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
          ● Starting soon
        </span>

        {editing ? (
          <div className="w-full max-w-sm space-y-2 rounded-2xl bg-black/70 p-4 text-left backdrop-blur">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Program title"
              className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
            />
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={120}
              placeholder="Tagline (e.g. Episode 4 · Guest: Ada)"
              className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
            />
            <input
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              maxLength={60}
              placeholder="Starts at (e.g. Tonight 8PM WAT)"
              className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
            />
            <div className="flex gap-2">
              <button
                onClick={saveShow}
                className="flex-1 rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 py-2 text-xs font-bold"
              >
                Save details
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="max-w-xl text-2xl font-black leading-tight sm:text-4xl">
              {stream.title}
            </h2>
            {stream.tagline && (
              <p className="max-w-lg text-sm text-fuchsia-200">{stream.tagline}</p>
            )}
            <p className="text-sm text-white/70">
              {stream.scheduledFor
                ? `🕒 ${stream.scheduledFor}`
                : `${stream.hostName} will start shortly`}
            </p>
            <p className="text-xs text-white/40">
              {stream.viewers} waiting in the room · {waiting} in the lobby
            </p>
          </>
        )}

        {isHost ? (
          <div className="mt-2 w-full max-w-sm space-y-3">
            {!editing && (
              <CoverUploader
                code={code}
                token={token}
                hasCover={stream.hasCover}
                onUploaded={onCoverChanged}
                compact={stream.hasCover}
              />
            )}
            {stream.mode === "video" && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-white/40">
                  Start with
                </span>
                {(["user", "environment"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFacing(f);
                      onPickFacing(f);
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      facing === f
                        ? "bg-fuchsia-500/30 text-white ring-1 ring-fuchsia-400"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    }`}
                  >
                    {f === "user" ? "🤳 Front camera" : "🌍 Back camera"}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => onStart(stream.mode)}
                className="rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-6 py-3 text-sm font-bold"
              >
                🔴 Go live with {stream.mode === "audio" ? "audio" : "video"}
              </button>
              <button
                onClick={() => onStart(stream.mode === "audio" ? "video" : "audio")}
                className="rounded-full bg-white/15 px-4 py-3 text-xs font-semibold"
              >
                Start with {stream.mode === "audio" ? "video" : "audio"} instead
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setEditing((v) => !v)}
                className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold"
              >
                ✏️ Edit show details
              </button>
              <button
                onClick={onShare}
                className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold"
              >
                📤 Share banner
              </button>
            </div>
            <p className="text-[11px] text-white/40">
              Your banner shows here and in every shared link until you go live.
            </p>
          </div>
        ) : (
          <p className="mt-2 max-w-sm text-xs text-white/50">
            The stream has not started yet. Hang tight — you can comment below while you
            wait.
          </p>
        )}
      </div>
    </div>
  );
}
