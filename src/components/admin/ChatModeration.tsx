"use client";

import { adminAction, type AdminRoom } from "@/lib/adminApi";
import type { PublicMessage } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

type Props = {
  room: AdminRoom;
  messages: PublicMessage[];
  onChanged: () => void;
  notify: (text: string, tone?: "ok" | "warn") => void;
};

export default function ChatModeration({ room, messages, onChanged, notify }: Props) {
  const [draft, setDraft] = useState("");
  const [asHost, setAsHost] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "real" | "sim">("all");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    const result = await adminAction({ code: room.code, action: "announce", body: text, asHost });
    setBusy(false);
    if (!result.ok) {
      notify(result.error ?? "Could not send", "warn");
      return;
    }
    setDraft("");
    onChanged();
  };

  const remove = async (id: number) => {
    const result = await adminAction({ code: room.code, action: "delete-message", messageId: id });
    if (!result.ok) notify(result.error ?? "Could not delete", "warn");
    onChanged();
  };

  const visible = messages.filter((m) =>
    filter === "all" ? true : filter === "sim" ? m.origin === "sim" : m.origin !== "sim" && m.kind !== "system",
  );

  return (
    <section className="flex h-[70vh] min-h-[420px] flex-col rounded-2xl border border-white/10 bg-white/5">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-bold">💬 Live chat</h3>
        <div className="ml-auto flex gap-1 text-[11px]">
          {(["all", "real", "sim"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-2.5 py-1 font-semibold ${filter === f ? "bg-fuchsia-500/30 ring-1 ring-fuchsia-400" : "bg-white/5 hover:bg-white/10"}`}
            >
              {f === "all" ? "All" : f === "real" ? "Real people" : "✦ Simulated"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-3">
        {visible.length === 0 && <p className="text-xs text-white/40">No messages yet.</p>}
        {visible.map((m) => (
          <div key={m.id} className="group flex items-start gap-2 rounded-lg px-1 py-0.5 hover:bg-white/5">
            {m.kind !== "system" && (
              m.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatar} alt="" className="mt-0.5 h-6 w-6 shrink-0 rounded-full" />
              ) : (
                <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-white/10" />
              )
            )}
            <p className={`min-w-0 flex-1 text-sm leading-snug ${m.kind === "system" ? "text-[11px] italic text-amber-200/80" : ""}`}>
              {m.kind !== "system" && (
                <span className={`font-semibold ${m.participantId ? "text-sky-300" : "text-amber-200"}`}>
                  {m.name}{" "}
                </span>
              )}
              <span className={m.kind === "reaction" ? "text-lg" : "text-white/90"}>{m.body}</span>
            </p>
            <button
              onClick={() => remove(m.id)}
              className="rounded px-1.5 text-[10px] text-rose-300 opacity-0 transition group-hover:opacity-100"
              title="Delete message"
            >
              ✕
            </button>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] text-white/60">
          <span>Post as</span>
          <button type="button" onClick={() => setAsHost(true)} className={`rounded-full px-2.5 py-1 font-semibold ${asHost ? "bg-fuchsia-500/30 ring-1 ring-fuchsia-400" : "bg-white/5"}`}>
            👑 {room.hostName}
          </button>
          <button type="button" onClick={() => setAsHost(false)} className={`rounded-full px-2.5 py-1 font-semibold ${!asHost ? "bg-fuchsia-500/30 ring-1 ring-fuchsia-400" : "bg-white/5"}`}>
            📣 Announcement
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={400}
            placeholder={asHost ? "Type as the host… (e.g. Type AMEN if you receive it)" : "Announcement to everyone…"}
            className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/50 px-4 py-2 text-sm outline-none focus:border-fuchsia-400"
          />
          <button type="submit" disabled={busy || !draft.trim()} className="rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-4 py-2 text-sm font-bold disabled:opacity-40">
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
