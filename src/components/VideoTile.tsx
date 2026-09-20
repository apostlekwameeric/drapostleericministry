"use client";

import type { PublicParticipant } from "@/lib/types";
import { useEffect, useRef } from "react";

type Props = {
  participant: PublicParticipant;
  stream: MediaStream | null;
  isLocal?: boolean;
  connection?: string;
  featured?: boolean;
  onKick?: () => void;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function VideoTile({
  participant,
  stream,
  isLocal = false,
  connection,
  featured = false,
  onKick,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasRemoteVideo = Boolean(stream?.getVideoTracks().some((t) => t.readyState === "live"));
  const showsVideo =
    (participant.media === "video" && participant.camOn) || (!isLocal && hasRemoteVideo);

  useEffect(() => {
    const el = videoRef.current;
    if (el && el.srcObject !== stream) {
      el.srcObject = stream;
      if (stream) el.play().catch(() => undefined);
    }
  }, [stream, showsVideo]);

  useEffect(() => {
    const el = audioRef.current;
    if (el && el.srcObject !== stream) {
      el.srcObject = stream;
      if (stream) el.play().catch(() => undefined);
    }
  }, [stream]);

  const connecting =
    !isLocal && stream === null && connection !== "connected" ? true : false;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black ${
        featured ? "h-full w-full" : "aspect-[3/4] w-full"
      }`}
    >
      {showsVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          disablePictureInPicture
          className="h-full w-full object-cover [transform:translateZ(0)]"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3">
          <div
            className={`flex items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 font-semibold text-white ${
              featured ? "h-28 w-28 text-3xl" : "h-16 w-16 text-lg"
            }`}
          >
            {initials(participant.name) || "?"}
          </div>
          <span className="text-xs uppercase tracking-widest text-white/50">
            {participant.media === "audio" ? "audio only" : "camera off"}
          </span>
        </div>
      )}

      {!isLocal && <audio ref={audioRef} autoPlay playsInline className="hidden" />}

      {connecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white/70">
          connecting…
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent p-2">
        <span className="truncate rounded-full bg-black/50 px-2 py-1 text-xs font-medium">
          {participant.role === "host" ? "👑 " : ""}
          {participant.name}
          {isLocal ? " (you)" : ""}
        </span>
        {!participant.micOn && (
          <span className="rounded-full bg-rose-600/90 px-2 py-1 text-[10px] font-semibold">
            muted
          </span>
        )}
      </div>

      {onKick && (
        <button
          type="button"
          onClick={onKick}
          className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-rose-300 opacity-0 transition group-hover:opacity-100"
        >
          remove
        </button>
      )}
    </div>
  );
}
