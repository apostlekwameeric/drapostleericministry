"use client";

import { adminAction, type AdminRoom } from "@/lib/adminApi";
import { useState } from "react";

type Props = {
  room: AdminRoom;
  onChanged: () => void;
  notify: (text: string, tone?: "ok" | "warn") => void;
};

export default function PeoplePanel({ room, onChanged, notify }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (key: string, payload: Record<string, unknown>, text?: string) => {
    setBusy(key);
    const result = await adminAction({ code: room.code, ...payload });
    setBusy(null);
    if (!result.ok) notify(result.error ?? "Action failed", "warn");
    else if (text) notify(text);
    onChanged();
  };

  const requests = room.participants.filter((p) => p.requestState === "pending");
  const stage = room.participants.filter((p) => p.role === "host" || p.role === "guest");
  const viewers = room.participants.filter((p) => p.role === "viewer");

  const small = "rounded-full px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-40";

  return (
    <div className="space-y-4">
      {/* requests */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="mb-3 text-sm font-bold">
          ✋ Join requests{" "}
          {requests.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-black">
              {requests.length}
            </span>
          )}
        </h3>
        {requests.length === 0 ? (
          <p className="text-xs text-white/40">Nobody is waiting to join the stage.</p>
        ) : (
          <ul className="space-y-2">
            {requests.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-black/40 p-2">
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-[11px] text-white/50">wants {p.requestedMedia}</span>
                <span className="ml-auto flex gap-1">
                  <button disabled={busy !== null} onClick={() => act(`ok-${p.id}`, { action: "approve", targetId: p.id, media: p.requestedMedia }, `${p.name} is on stage`)} className={`${small} bg-emerald-500 text-black`}>
                    Accept
                  </button>
                  <button disabled={busy !== null} onClick={() => act(`au-${p.id}`, { action: "approve", targetId: p.id, media: "audio" })} className={`${small} bg-white/15`}>
                    🎙️ audio only
                  </button>
                  <button disabled={busy !== null} onClick={() => act(`no-${p.id}`, { action: "decline", targetId: p.id })} className={`${small} bg-white/10 text-rose-300`}>
                    Decline
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* on stage */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="mb-3 text-sm font-bold">🎤 On stage ({stage.length})</h3>
        <ul className="space-y-2">
          {stage.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-black/40 p-2">
              <span className="text-sm font-medium">
                {p.role === "host" ? "👑" : "🎤"} {p.name}
              </span>
              <span className="text-[11px] text-white/50">
                {p.media} · {p.micOn ? "mic on" : "muted"}
                {p.media === "video" ? (p.camOn ? " · cam on" : " · cam off") : ""}
              </span>
              {p.role !== "host" && (
                <span className="ml-auto flex gap-1">
                  <button disabled={busy !== null} onClick={() => act(`gm-${p.id}`, { action: "guest-mic", targetId: p.id, on: !p.micOn })} className={`${small} ${p.micOn ? "bg-white/15" : "bg-rose-600"}`}>
                    {p.micOn ? "Mute" : "Unmute"}
                  </button>
                  <button disabled={busy !== null} onClick={() => act(`rs-${p.id}`, { action: "remove-stage", targetId: p.id }, `${p.name} moved to audience`)} className={`${small} bg-white/10 text-amber-200`}>
                    Off stage
                  </button>
                  <button disabled={busy !== null} onClick={() => { if (confirm(`Remove ${p.name} from the room?`)) void act(`k-${p.id}`, { action: "kick", targetId: p.id }, `${p.name} removed`); }} className={`${small} bg-white/10 text-rose-300`}>
                    Remove
                  </button>
                </span>
              )}
            </li>
          ))}
          {stage.length === 0 && <p className="text-xs text-white/40">Nobody on stage yet.</p>}
        </ul>
      </section>

      {/* viewers */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="mb-3 text-sm font-bold">👀 Watching ({viewers.length})</h3>
        {viewers.length === 0 ? (
          <p className="text-xs text-white/40">No viewers connected right now.</p>
        ) : (
          <ul className="max-h-72 space-y-1.5 overflow-y-auto">
            {viewers.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-black/30 px-2 py-1.5">
                <span className="text-sm">{p.name}</span>
                {p.handRaised && <span className="text-amber-300">✋</span>}
                {p.muted && <span className="rounded bg-rose-500/20 px-1 text-[9px] text-rose-200">chat muted</span>}
                {p.requestState === "invited" && <span className="text-[10px] text-fuchsia-200">invited</span>}
                <span className="ml-auto flex gap-1">
                  <button disabled={busy !== null || p.requestState === "invited"} onClick={() => act(`inv-${p.id}`, { action: "invite", targetId: p.id }, `Invited ${p.name}`)} className={`${small} bg-white/10 text-fuchsia-200`}>
                    Invite up
                  </button>
                  <button disabled={busy !== null} onClick={() => act(`mu-${p.id}`, { action: "mute-chat", targetId: p.id, on: !p.muted })} className={`${small} bg-white/10`}>
                    {p.muted ? "Unmute chat" : "Mute chat"}
                  </button>
                  <button disabled={busy !== null} onClick={() => { if (confirm(`Remove ${p.name}?`)) void act(`k-${p.id}`, { action: "kick", targetId: p.id }); }} className={`${small} bg-white/10 text-rose-300`}>
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
