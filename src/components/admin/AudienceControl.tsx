"use client";

import { adminAction, type AdminRoom } from "@/lib/adminApi";
import type { SimFocus, SimPace } from "@/lib/types";
import { useEffect, useState } from "react";

type Props = {
  room: AdminRoom;
  onChanged: () => void;
  notify: (text: string, tone?: "ok" | "warn") => void;
};

const FOCUS: { key: SimFocus; label: string; emoji: string }[] = [
  { key: "auto", label: "Follow the message", emoji: "🎯" },
  { key: "blessing", label: "Blessing", emoji: "✨" },
  { key: "healing", label: "Healing", emoji: "🙌" },
  { key: "miracle", label: "Miracles", emoji: "🎉" },
  { key: "offering", label: "Offering", emoji: "🌱" },
  { key: "prayer", label: "Prayer", emoji: "🙏" },
];

const PACE: { key: SimPace; label: string; hint: string }[] = [
  { key: "calm", label: "Calm", hint: "every 2–3 min" },
  { key: "normal", label: "Normal", hint: "every 1–3 min" },
  { key: "lively", label: "Lively", hint: "about every minute" },
];

const QUICK = [
  "Healing service — by His stripes we are healed (Isaiah 53:5)",
  "Seed time and harvest — Luke 6:38, give and it shall be given",
  "Breakthrough night — your season of struggle is over",
  "Testimony service — what God has done this year",
  "Prayer & deliverance — every chain is broken tonight",
];

export default function AudienceControl({ room, onChanged, notify }: Props) {
  const sim = room.sim;
  const [busy, setBusy] = useState<string | null>(null);
  const [topicDraft, setTopicDraft] = useState<{ code: string; value: string } | null>(null);
  const topic = topicDraft && topicDraft.code === room.code ? topicDraft.value : (sim.context ?? "");
  const setTopic = (value: string) => setTopicDraft({ code: room.code, value });
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!sim.enabled || !sim.nextAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sim.enabled, sim.nextAt]);

  const countdown = (() => {
    if (!sim.enabled || !sim.nextAt || now === 0) return "";
    const ms = new Date(sim.nextAt).getTime() - now;
    if (ms <= 0) return "any moment now";
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
  })();

  const act = async (key: string, payload: Record<string, unknown>, text?: string) => {
    setBusy(key);
    const result = await adminAction({ code: room.code, ...payload });
    setBusy(null);
    if (!result.ok) notify(result.error ?? "Action failed", "warn");
    else if (text) notify(text);
    onChanged();
  };

  return (
    <div className="space-y-4">
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${sim.enabled ? "border-violet-400/40 bg-violet-500/15" : "border-white/10 bg-white/5"}`}>
        <div>
          <p className="text-sm font-bold">
            ✦ Simulated global audience — {sim.enabled ? "running" : "paused"}
            {sim.enabled && countdown && <span className="ml-2 text-xs font-normal text-violet-200">· next wave in {countdown}</span>}
          </p>
          <p className="text-[11px] text-white/50">{sim.count} generated this live</p>
        </div>
        <div className="flex gap-2">
          <button
            disabled={busy !== null || room.status !== "live"}
            onClick={() => act("toggle", { action: "sim-toggle", enabled: !sim.enabled }, sim.enabled ? "Audience paused" : "Audience started")}
            className={`rounded-full px-5 py-2.5 text-sm font-bold disabled:opacity-40 ${sim.enabled ? "bg-white/15 hover:bg-white/25" : "bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]"}`}
          >
            {sim.enabled ? "⏸ Pause" : "▶ Start"}
          </button>
          <button disabled={busy !== null || !sim.enabled} onClick={() => act("burst", { action: "sim-burst" }, "Wave queued")} className="rounded-full bg-white/10 px-4 py-2.5 text-xs font-semibold hover:bg-white/20 disabled:opacity-40">
            🌊 Wave now
          </button>
          <button disabled={busy !== null} onClick={() => { if (confirm("Delete all simulated comments in this room?")) void act("clear", { action: "sim-clear" }, "Simulated comments cleared"); }} className="rounded-full bg-white/5 px-4 py-2.5 text-xs font-semibold text-rose-300 hover:bg-white/10 disabled:opacity-40">
            🧹 Clear
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-2 text-sm font-bold">What is being ministered?</h3>
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3} maxLength={600} placeholder="e.g. Healing service tonight — Isaiah 53:5" className="w-full resize-none rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-fuchsia-400" />
          <div className="mt-1 flex flex-wrap gap-1">
            {QUICK.map((q) => (
              <button key={q} onClick={() => setTopic(q)} className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/60 hover:bg-white/10">
                {q.split(" — ")[0]}
              </button>
            ))}
          </div>
          <button disabled={busy !== null || topic === (sim.context ?? "")} onClick={() => act("ctx", { action: "sim-config", context: topic }, "Context updated")} className="mt-2 w-full rounded-full bg-white/10 py-2 text-xs font-semibold hover:bg-white/20 disabled:opacity-40">
            Update the crowd&apos;s context
          </button>
          <p className="mt-2 text-[10px] text-white/40">
            The crowd also reads the host&apos;s chat messages. Post “Type AMEN if you receive it” from the Chat tab and watch them respond.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-2 text-sm font-bold">Focus</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {FOCUS.map((f) => (
              <button key={f.key} disabled={busy !== null} onClick={() => act(`f-${f.key}`, { action: "sim-config", focus: f.key })} className={`rounded-xl px-2 py-2 text-[11px] font-semibold ${sim.focus === f.key ? "bg-fuchsia-500/30 ring-1 ring-fuchsia-400" : "bg-white/5 text-white/70 hover:bg-white/10"}`}>
                {f.emoji} {f.label}
              </button>
            ))}
          </div>
          <h3 className="mt-4 mb-2 text-sm font-bold">Pace</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {PACE.map((p) => (
              <button key={p.key} disabled={busy !== null} onClick={() => act(`p-${p.key}`, { action: "sim-config", pace: p.key })} className={`rounded-xl px-2 py-2 text-left ${sim.pace === p.key ? "bg-fuchsia-500/30 ring-1 ring-fuchsia-400" : "bg-white/5 text-white/70 hover:bg-white/10"}`}>
                <span className="block text-[11px] font-semibold">{p.label}</span>
                <span className="block text-[10px] text-white/50">{p.hint}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <p className="rounded-xl bg-white/5 px-3 py-2 text-[10px] leading-relaxed text-white/50">
        Real people can comment at any time as normal.
      </p>
    </div>
  );
}
