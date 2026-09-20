"use client";

import type { Identity } from "@/lib/types";
import { useLiveRoom } from "@/lib/useLiveRoom";
import { useEffect, useRef } from "react";

type Props = {
  identity: Identity;
};

export default function HostMediaDock({ identity }: Props) {
  const live = useLiveRoom(identity);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const me = live.me;
  const videoMode = me?.media === "video" || live.localStream?.getVideoTracks().length;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = live.localStream;
    if (live.localStream) el.play().catch(() => undefined);
  }, [live.localStream]);

  const btn =
    "rounded-full px-4 py-2 text-xs font-semibold transition disabled:opacity-40 bg-white/10 hover:bg-white/20";
  const on = "rounded-full px-4 py-2 text-xs font-semibold bg-fuchsia-500/30 ring-1 ring-fuchsia-400";
  const off = "rounded-full px-4 py-2 text-xs font-semibold bg-rose-600/80";

  return (
    <div>
      <div className="relative mb-3 overflow-hidden rounded-xl border border-white/10 bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`aspect-video w-full object-cover ${me?.camOn === false ? "opacity-30" : ""}`}
        />
        {!live.localStream && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-white/50">
            {live.mediaError ?? "Starting camera… allow access if the browser asks."}
          </p>
        )}
      </div>
      {live.mediaError && (
        <p className="mb-2 text-[11px] text-amber-200">{live.mediaError}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={me?.micOn === false ? off : btn}
          onClick={() => live.toggle({ micOn: !me?.micOn })}
        >
          {me?.micOn === false ? "🔇 Mic off" : "🎙️ Mic on"}
        </button>
        <button
          type="button"
          className={me?.camOn === false ? off : btn}
          onClick={() => live.toggle({ camOn: !me?.camOn })}
        >
          {me?.camOn === false ? "🚫 Camera off" : "📹 Camera on"}
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => live.setMedia(me?.media === "video" ? "audio" : "video")}
        >
          Switch to {me?.media === "video" ? "audio" : "video"}
        </button>
      </div>

      <p className="mt-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
        Camera
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={live.switchingCamera} onClick={() => void live.flipCamera()}>
          {live.switchingCamera ? "Switching…" : "🔄 Flip front / back"}
        </button>
        <button
          type="button"
          className={live.activeFacing === "user" ? on : btn}
          disabled={live.switchingCamera}
          onClick={() => void live.selectCamera({ facing: "user" })}
        >
          🤳 Front
        </button>
        <button
          type="button"
          className={live.activeFacing === "environment" ? on : btn}
          disabled={live.switchingCamera}
          onClick={() => void live.selectCamera({ facing: "environment" })}
        >
          🌍 Back
        </button>
        <button
          type="button"
          className={btn}
          disabled={live.switchingCamera}
          onClick={() => void live.selectUsbCamera()}
        >
          🔌 USB camera
        </button>
      </div>
      {live.cameras.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {live.cameras.map((cam, i) => (
            <button
              key={cam.deviceId || i}
              type="button"
              disabled={live.switchingCamera}
              onClick={() => void live.selectCamera({ deviceId: cam.deviceId })}
              className={`rounded-lg px-2 py-1 text-[11px] ${
                cam.deviceId === live.activeCameraId
                  ? "bg-fuchsia-500/30 ring-1 ring-fuchsia-400"
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >
              {cam.facing === "environment" ? "🌍" : cam.facing === "user" ? "🤳" : "🎥"}{" "}
              {cam.label.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)/i, "") || `Camera ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
        Light
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={live.torchOn ? "rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-black" : btn}
          onClick={() => void live.setTorch(!live.torchOn)}
        >
          {live.torchOn ? "🔦 Light on" : "🔦 Light off"}
        </button>
        <a
          href={`/live/${identity.code}`}
          className="rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-4 py-2 text-xs font-bold"
        >
          ▶ Open host stage
        </a>
        <span className="text-[11px] text-white/40">
          {videoMode
            ? live.torchSupported
              ? "Torch available on this camera"
              : "If the light stays off, switch to the back camera"
            : "Switch to video to use the light"}
        </span>
      </div>
    </div>
  );
}
