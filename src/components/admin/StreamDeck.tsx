"use client";

import HostMediaDock from "@/components/admin/HostMediaDock";
import { adminAction, adminHeaders, getAdminToken, type AdminRoom } from "@/lib/adminApi";
import { prepareImage, uploadImage } from "@/lib/clientImage";
import { loadIdentity, saveIdentity } from "@/lib/identity";
import type { Identity } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

type Props = {
  room: AdminRoom;
  onChanged: () => void;
  notify: (text: string, tone?: "ok" | "warn") => void;
};

function Section({ title, children, hint }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">{title}</h3>
        {hint && <span className="text-[10px] text-white/40">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Btn({
  children,
  onClick,
  tone = "neutral",
  disabled,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "neutral" | "primary" | "danger" | "amber";
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
  const base = "rounded-full px-4 py-2 text-xs font-semibold transition disabled:opacity-40";
  const tones = {
    neutral: active ? "bg-fuchsia-500/30 ring-1 ring-fuchsia-400" : "bg-white/10 hover:bg-white/20",
    primary: "bg-gradient-to-r from-fuchsia-500 to-rose-500 font-bold",
    danger: "bg-rose-600/80 hover:bg-rose-600",
    amber: active
      ? "bg-amber-400 text-black shadow-[0_0_16px_rgba(251,191,36,0.6)]"
      : "bg-white/10 hover:bg-white/20",
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={`${base} ${tones[tone]}`}>
      {children}
    </button>
  );
}

export default function StreamDeck({ room, onChanged, notify }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [title, setTitle] = useState(room.title);
  const [tagline, setTagline] = useState(room.tagline ?? "");
  const [scheduledFor, setScheduledFor] = useState(room.scheduledFor ?? "");
  const [hostName, setHostName] = useState(room.hostName);
  const [coverBusy, setCoverBusy] = useState(false);
  const [hostIdentity, setHostIdentity] = useState<Identity | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTitle(room.title);
    setTagline(room.tagline ?? "");
    setScheduledFor(room.scheduledFor ?? "");
    setHostName(room.hostName);
    const stored = loadIdentity(room.code);
    setHostIdentity(stored?.role === "host" ? stored : null);
  }, [room.code, room.title, room.tagline, room.scheduledFor, room.hostName]);

  const act = async (key: string, payload: Record<string, unknown>, successText?: string) => {
    setBusy(key);
    const result = await adminAction({ code: room.code, ...payload });
    setBusy(null);
    if (!result.ok) notify(result.error ?? "Action failed", "warn");
    else if (successText) notify(successText);
    onChanged();
    return result;
  };

  const onAir = room.phase === "onair" && room.status === "live";
  const ended = room.status === "ended";
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/live/${room.code}` : `/live/${room.code}`;

  const uploadCover = async (file: File) => {
    setCoverBusy(true);
    try {
      const prepared = await prepareImage(file, { maxEdge: 1600, preferJpeg: true, keepGif: true });
      const outcome = await uploadImage(
        "/api/admin/cover",
        prepared.blob,
        { code: room.code, adminToken: getAdminToken() ?? "" },
        "banner",
        adminHeaders(),
      );
      URL.revokeObjectURL(prepared.previewUrl);
      if (!outcome.ok) notify(outcome.error, "warn");
      else notify("Program banner updated");
      onChanged();
    } catch {
      notify("Could not read that image", "warn");
    } finally {
      setCoverBusy(false);
    }
  };

  const openAsHost = async (sameTab = false) => {
    const result = await adminAction({ code: room.code, action: "host-token" });
    if (!result.ok || !result.identity) {
      notify(result.error ?? "Could not open as host", "warn");
      return false;
    }
    saveIdentity(result.identity as Identity);
    if (sameTab) {
      window.location.assign(`/live/${room.code}`);
    } else {
      window.open(`/live/${room.code}`, "_blank", "noopener");
    }
    return true;
  };

  const goLiveAsHost = async (media: "video" | "audio") => {
    setBusy("start");
    const started = await adminAction({ code: room.code, action: "start-stream", media });
    if (!started.ok) {
      setBusy(null);
      notify(started.error ?? "Could not go live", "warn");
      onChanged();
      return;
    }
    const result = await adminAction({ code: room.code, action: "host-token" });
    setBusy(null);
    if (!result.ok || !result.identity) {
      notify("Live started, but the host view could not open. Use Open as host.", "warn");
      onChanged();
      return;
    }
    saveIdentity(result.identity as Identity);
    setHostIdentity(result.identity as Identity);
    notify(media === "audio" ? "You are live on audio from this dashboard." : "You are live — camera is running here.");
    onChanged();
  };

  const enableCameraHere = async () => {
    const result = await adminAction({ code: room.code, action: "host-token" });
    if (!result.ok || !result.identity) {
      notify(result.error ?? "Could not start the host camera here", "warn");
      return;
    }
    saveIdentity(result.identity as Identity);
    setHostIdentity(result.identity as Identity);
    notify("Camera, mic and light are active on this dashboard");
  };

  return (
    <div className="space-y-4">
      {/* status strip */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-r from-zinc-900 to-black p-4">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            ended ? "bg-white/15" : onAir ? "pulse-ring bg-rose-600" : "bg-violet-600"
          }`}
        >
          {ended ? "ended" : onAir ? "● on air" : "backstage"}
        </span>
        <span className="text-sm font-semibold">{room.title}</span>
        <span className="text-xs text-white/50">
          · {room.hostName} · code <span className="font-mono text-fuchsia-300">{room.code.toUpperCase()}</span>
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs">
          <span className={`h-2 w-2 rounded-full ${room.hostOnline ? "bg-emerald-400" : "bg-rose-500"}`} />
          {room.hostOnline ? "host device connected" : "host device offline"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* broadcast */}
        <Section title="Broadcast" hint="start, pause and end the stream">
          <div className="flex flex-wrap gap-2">
            {!ended && !onAir && (
              <>
                <Btn tone="primary" disabled={busy !== null} onClick={() => void goLiveAsHost("video")}>
                  🔴 Go live (video)
                </Btn>
                <Btn disabled={busy !== null} onClick={() => void goLiveAsHost("audio")}>
                  🎙️ Go live (audio)
                </Btn>
              </>
            )}
            {onAir && (
              <Btn disabled={busy !== null} onClick={() => act("break", { action: "back-to-prelive" }, "Stream paused — banner is showing")}>
                ⏸ Take a break (show banner)
              </Btn>
            )}
            {!ended && (
              <Btn tone="danger" disabled={busy !== null} onClick={() => { if (confirm("End this live for everyone?")) void act("end", { action: "end-stream" }, "Live ended"); }}>
                ⏹ End live
              </Btn>
            )}
            {ended && (
              <Btn disabled={busy !== null} onClick={() => act("reopen", { action: "reopen-stream" }, "Room reopened backstage")}>
                ↺ Reopen room
              </Btn>
            )}
            <Btn onClick={() => void openAsHost(false)} title="Opens the live room as the host on this device">
              📱 Open as host
            </Btn>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/50">
            <span className="truncate rounded-lg bg-black/40 px-2 py-1 font-mono">{shareUrl}</span>
            <button
              className="rounded-full bg-white/10 px-3 py-1 font-semibold hover:bg-white/20"
              onClick={() => navigator.clipboard.writeText(shareUrl).then(() => notify("Link copied"))}
            >
              Copy link
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`🔴 ${room.title} — join here: ${shareUrl} · Room code ${room.code.toUpperCase()}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#25D366]/20 px-3 py-1 font-semibold text-[#7ef0ab]"
            >
              WhatsApp
            </a>
          </div>
        </Section>

        {/* camera & light */}
        <Section title="Camera, mic & light" hint="Live on this dashboard — allow camera when the browser asks">
          {hostIdentity ? (
            <HostMediaDock identity={hostIdentity} />
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-white/50">
                Turn on the camera here so Flip, Front, Back, Light, Mic and Cam work from this
                dashboard.
              </p>
              <Btn tone="primary" onClick={() => void enableCameraHere()}>
                🎥 Enable camera on this device
              </Btn>
            </div>
          )}
        </Section>

        {/* show details */}
        <Section title="Show details" hint="title, tagline, time, host name">
          <div className="space-y-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Program title" className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-fuchsia-400" />
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={120} placeholder="Tagline" className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-fuchsia-400" />
            <div className="grid grid-cols-2 gap-2">
              <input value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} maxLength={60} placeholder="Starts at" className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-fuchsia-400" />
              <input value={hostName} onChange={(e) => setHostName(e.target.value)} maxLength={32} placeholder="Host name" className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-fuchsia-400" />
            </div>
            <Btn
              tone="primary"
              disabled={busy !== null}
              onClick={() => act("show", { action: "update-show", title, tagline, scheduledFor, hostName }, "Show details saved")}
            >
              Save details
            </Btn>
          </div>
        </Section>

        {/* banner */}
        <Section title="Program banner" hint="shown before the stream and in shared links">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void uploadCover(f);
            }}
          />
          <div className="flex gap-3">
            <div className="h-24 w-40 shrink-0 overflow-hidden rounded-xl bg-black/50">
              {room.hasCover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/streams/${room.code}/cover?v=${room.coverVersion}`} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-xs text-white/40">No banner</div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Btn tone="primary" disabled={coverBusy} onClick={() => fileRef.current?.click()}>
                {coverBusy ? "Uploading…" : room.hasCover ? "🖼️ Replace banner" : "🖼️ Upload banner"}
              </Btn>
              {room.hasCover && (
                <Btn
                  tone="danger"
                  disabled={coverBusy}
                  onClick={async () => {
                    await fetch("/api/admin/cover", {
                      method: "DELETE",
                      headers: adminHeaders({ "Content-Type": "application/json" }),
                      body: JSON.stringify({ code: room.code }),
                    });
                    notify("Banner removed");
                    onChanged();
                  }}
                >
                  Remove
                </Btn>
              )}
              <a href={`/api/streams/${room.code}/banner?format=story&v=${room.coverVersion}`} target="_blank" rel="noopener noreferrer" className="text-center text-[11px] text-fuchsia-300 underline">
                Download share image
              </a>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
