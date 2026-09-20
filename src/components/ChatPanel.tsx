"use client";

import type { PublicMessage } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

type Props = {
  messages: PublicMessage[];
  myId: number | null;
  onSend: (body: string) => void;
  onReact: (emoji: string) => void;
  variant: "overlay" | "side";
};

const REACTIONS = ["❤️", "🔥", "😂", "👏", "🎉"];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function Avatar({ src, name, size }: { src: string | null; name: string; size: "sm" | "md" }) {
  const box = size === "sm" ? "h-6 w-6 text-[9px]" : "h-7 w-7 text-[10px]";
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        className={`${box} shrink-0 rounded-full bg-white/10 object-cover ring-1 ring-black/40`}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      className={`${box} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 font-bold ring-1 ring-black/40`}
    >
      {initials(name) || "?"}
    </span>
  );
}

export default function ChatPanel({
  messages,
  myId,
  onSend,
  onReact,
  variant,
}: Props) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  const isOverlay = variant === "overlay";
  const avatarSize = isOverlay ? "sm" : "md";

  return (
    <div
      className={
        isOverlay
          ? "pointer-events-none flex w-full flex-col justify-end gap-2"
          : "flex h-full min-h-0 flex-col"
      }
    >
      {!isOverlay && (
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white/80">
          Live chat
        </div>
      )}

      <div
        className={
          isOverlay
            ? "pointer-events-auto max-h-[45vh] space-y-1.5 overflow-y-auto px-3 pb-1 [scrollbar-width:none]"
            : "flex-1 space-y-2 overflow-y-auto px-4 py-3"
        }
      >
        {messages.length === 0 && (
          <p className="text-xs text-white/40">Say something nice 👋</p>
        )}
        {messages.map((m) => {
          if (m.kind === "system") {
            return (
              <p key={m.id} className="text-[11px] italic text-amber-200/80">
                {m.body}
              </p>
            );
          }
          if (m.kind === "reaction") {
            return (
              <div key={m.id} className="flex items-center gap-2 text-sm text-white/80">
                <Avatar src={m.avatar} name={m.name} size={avatarSize} />
                <span className="font-semibold text-fuchsia-300">
                  {m.name}
                </span>
                <span className="text-lg">{m.body}</span>
              </div>
            );
          }
          return (
            <div key={m.id} className="flex items-start gap-2">
              <Avatar src={m.avatar} name={m.name} size={avatarSize} />
              <p
                className={`min-w-0 flex-1 text-sm leading-snug ${
                  isOverlay ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" : ""
                }`}
              >
                <span
                  className={`font-semibold ${
                    m.participantId === myId ? "text-emerald-300" : "text-sky-300"
                  }`}
                >
                  {m.name}
                </span>{" "}
                <span className="text-white/90">{m.body}</span>
              </p>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className={isOverlay ? "pointer-events-auto px-3 pb-3" : "px-4 pb-4"}>
        <div className="mb-2 flex gap-1">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact(emoji)}
              className="rounded-full bg-white/10 px-2 py-1 text-base transition hover:scale-110 hover:bg-white/20"
            >
              {emoji}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment…"
            maxLength={400}
            className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/50 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-fuchsia-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            disabled={draft.trim().length === 0}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
