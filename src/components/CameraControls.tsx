"use client";

import type { CameraOption, Facing } from "@/lib/useLiveRoom";
import { useEffect, useState } from "react";

type Props = {
  cameras: CameraOption[];
  activeCameraId: string | null;
  activeFacing: Facing | "unknown";
  switching: boolean;
  torchSupported: boolean;
  torchOn: boolean;
  autoLight: boolean;
  onSelect: (deviceId: string) => void;
  onFlip: () => void;
  onTorch: (on: boolean) => void;
  onAutoLight: (on: boolean) => void;
};

function niceLabel(cam: CameraOption, index: number) {
  if (cam.facing === "environment") return "Back camera";
  if (cam.facing === "user") return "Front camera";
  const clean = cam.label.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*/i, "").trim();
  return clean || `Camera ${index + 1}`;
}

export default function CameraControls({
  cameras,
  activeCameraId,
  activeFacing,
  switching,
  torchSupported,
  torchOn,
  autoLight,
  onSelect,
  onFlip,
  onTorch,
  onAutoLight,
}: Props) {
  const [open, setOpen] = useState(false);
  const [evening, setEvening] = useState(false);

  useEffect(() => {
    const check = () => {
      const hour = new Date().getHours();
      setEvening(hour >= 17 || hour < 7);
    };
    check();
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, []);

  const multiple = cameras.length > 1;
  const activeLabel = (() => {
    const index = cameras.findIndex((c) => c.deviceId === activeCameraId);
    if (index >= 0) return niceLabel(cameras[index], index);
    if (activeFacing === "environment") return "Back camera";
    if (activeFacing === "user") return "Front camera";
    return "Camera";
  })();

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      {multiple && (
        <button
          onClick={onFlip}
          disabled={switching}
          className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold hover:bg-white/25 disabled:opacity-50"
          title="Flip between front and back camera"
        >
          {switching ? "Switching…" : "🔄 Flip"}
        </button>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        disabled={switching || cameras.length === 0}
        className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20 disabled:opacity-50"
      >
        🎥 {activeLabel} ▾
      </button>

      {torchSupported && (
        <button
          onClick={() => onTorch(!torchOn)}
          className={`rounded-full px-4 py-2 text-xs font-bold transition ${
            torchOn
              ? "bg-amber-400 text-black shadow-[0_0_18px_rgba(251,191,36,0.65)]"
              : "bg-white/15 hover:bg-white/25"
          }`}
          title="Camera light for dark rooms"
        >
          {torchOn ? "🔦 Light on" : "🔦 Light off"}
        </button>
      )}

      {torchSupported && evening && !torchOn && (
        <span className="animate-pulse rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-semibold text-amber-200">
          It&apos;s dark — turn the light on
        </span>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute bottom-12 left-0 z-40 w-72 rounded-2xl border border-white/15 bg-zinc-900/95 p-2 shadow-2xl backdrop-blur">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
              Choose camera
            </p>
            {cameras.length === 0 && (
              <p className="px-2 py-2 text-xs text-white/50">No cameras detected.</p>
            )}
            {cameras.map((cam, index) => {
              const active = cam.deviceId === activeCameraId;
              return (
                <button
                  key={cam.deviceId || index}
                  onClick={() => {
                    onSelect(cam.deviceId);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs transition ${
                    active ? "bg-fuchsia-500/25 text-white" : "hover:bg-white/10"
                  }`}
                >
                  <span className="text-base">
                    {cam.facing === "environment"
                      ? "🌍"
                      : cam.facing === "user"
                        ? "🤳"
                        : "🎥"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {niceLabel(cam, index)}
                    {cam.facing === "unknown" && cam.label && (
                      <span className="block truncate text-[10px] text-white/40">
                        {cam.label}
                      </span>
                    )}
                  </span>
                  {active && <span className="text-[10px] text-fuchsia-200">live</span>}
                </button>
              );
            })}

            {torchSupported && (
              <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-xs hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={autoLight}
                  onChange={(e) => onAutoLight(e.target.checked)}
                  className="h-3.5 w-3.5 accent-amber-400"
                />
                <span className="flex-1">
                  Auto light in the evening
                  <span className="block text-[10px] text-white/40">
                    Keeps the lamp on when you switch cameras
                  </span>
                </span>
              </label>
            )}
          </div>
        </>
      )}
    </div>
  );
}
