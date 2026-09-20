"use client";

import type { SimFocus, SimPace, SimStatus } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  sim: SimStatus;
  onToggle: (enabled: boolean) => Promise<unknown> | void;
  onConfig: (patch: {
    focus?: string;
    pace?: string;
    context?: string;
    transcript?: string;
  }) => Promise<unknown> | void;
  onBurst: () => Promise<unknown> | void;
  onClear: () => Promise<unknown> | void;
};

type SpeechResultLike = { transcript: string };
type SpeechResultListLike = ArrayLike<ArrayLike<SpeechResultLike> & { isFinal: boolean }>;
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { resultIndex: number; results: SpeechResultListLike }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};
type SpeechCtor = new () => SpeechRecognitionLike;

const FOCUS: { key: SimFocus; label: string; emoji: string }[] = [
  { key: "auto", label: "Follow my message", emoji: "🎯" },
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

const QUICK_TOPICS = [
  "Healing service — by His stripes we are healed (Isaiah 53:5)",
  "Seed time and harvest — Luke 6:38, give and it shall be given",
  "Breakthrough night — your season of struggle is over",
  "Testimony service — what God has done this year",
  "Prayer & deliverance — every chain is broken tonight",
];

export default function AudiencePanel({
  open,
  onClose,
  sim,
  onToggle,
  onConfig,
  onBurst,
  onClear,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [topic, setTopic] = useState(sim.context ?? "");
  const [countdown, setCountdown] = useState("");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const lastSentRef = useRef("");

  useEffect(() => {
    if (open) setTopic(sim.context ?? "");
  }, [open, sim.context]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechCtor;
      webkitSpeechRecognition?: SpeechCtor;
    };
    setSpeechSupported(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    if (!sim.enabled || !sim.nextAt) {
      setCountdown("");
      return;
    }
    const update = () => {
      const ms = new Date(sim.nextAt as string).getTime() - Date.now();
      if (ms <= 0) {
        setCountdown("any moment now");
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setCountdown(m > 0 ? `in ${m}m ${String(s).padStart(2, "0")}s` : `in ${s}s`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [sim.enabled, sim.nextAt]);

  const run = useCallback(async (key: string, fn: () => Promise<unknown> | void) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }, []);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      rec.onend = null;
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const w = window as unknown as {
      SpeechRecognition?: SpeechCtor;
      webkitSpeechRecognition?: SpeechCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-GB";
    rec.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalText += ` ${result[0]?.transcript ?? ""}`;
      }
      if (finalText.trim()) {
        transcriptRef.current = `${transcriptRef.current} ${finalText}`.trim().slice(-800);
        setTranscript(transcriptRef.current);
      }
    };
    rec.onerror = () => {
      /* keep going; onend restarts */
    };
    rec.onend = () => {
      if (recognitionRef.current === rec) {
        try {
          rec.start();
        } catch {
          setListening(false);
        }
      }
    };
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, []);

  // Push the rolling transcript to the generator every 15s while listening.
  useEffect(() => {
    if (!listening) return;
    const timer = setInterval(() => {
      const current = transcriptRef.current;
      if (current && current !== lastSentRef.current) {
        lastSentRef.current = current;
        void onConfig({ transcript: current });
      }
    }, 15_000);
    return () => clearInterval(timer);
  }, [listening, onConfig]);

  useEffect(() => () => stopListening(), [stopListening]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-zinc-950 p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">✦ Simulated global audience</h2>
            <p className="text-xs text-white/50">
              Generated commenters from around the world, themed on blessing, healing,
              miracles and offering.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70"
          >
            ✕
          </button>
        </div>

        {/* master switch */}
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${
            sim.enabled
              ? "border-violet-400/40 bg-violet-500/15"
              : "border-white/10 bg-white/5"
          }`}
        >
          <div>
            <p className="text-sm font-bold">
              {sim.enabled ? "Running" : "Paused"}
              {sim.enabled && countdown && (
                <span className="ml-2 text-xs font-normal text-violet-200">
                  · next wave {countdown}
                </span>
              )}
            </p>
            <p className="text-[11px] text-white/50">
              {sim.count} comments generated this live
            </p>
          </div>
          <button
            onClick={() => run("toggle", () => onToggle(!sim.enabled))}
            disabled={busy !== null}
            className={`rounded-full px-5 py-3 text-sm font-bold transition disabled:opacity-50 ${
              sim.enabled
                ? "bg-white/15 hover:bg-white/25"
                : "bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
            }`}
          >
            {busy === "toggle" ? "…" : sim.enabled ? "⏸ Pause" : "▶ Start"}
          </button>
        </div>

        {/* topic */}
        <div className="mt-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-white/40">
            What are you ministering on?
          </p>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={2}
            maxLength={600}
            placeholder="e.g. Healing service tonight — Isaiah 53:5, by His stripes we are healed"
            className="w-full resize-none rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
          />
          <div className="mt-1 flex flex-wrap gap-1">
            {QUICK_TOPICS.map((q) => (
              <button
                key={q}
                onClick={() => setTopic(q)}
                className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/60 hover:bg-white/10"
              >
                {q.split(" — ")[0]}
              </button>
            ))}
          </div>
          <button
            onClick={() => run("context", () => onConfig({ context: topic }))}
            disabled={busy !== null || topic === (sim.context ?? "")}
            className="mt-2 w-full rounded-full bg-white/10 py-2 text-xs font-semibold hover:bg-white/20 disabled:opacity-40"
          >
            {busy === "context" ? "Saving…" : "Update the crowd's context"}
          </button>
          <p className="mt-1 text-[10px] text-white/40">
            The crowd also reads your chat messages — try typing “type AMEN if you receive it”.
          </p>
        </div>

        {/* speech */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">🎙️ Listen & follow my sermon</p>
              <p className="text-[10px] text-white/50">
                {speechSupported
                  ? "Transcribes your voice on this device so comments echo what you say."
                  : "Not supported in this browser — use Chrome on Android or desktop."}
              </p>
            </div>
            <button
              onClick={() => (listening ? stopListening() : startListening())}
              disabled={!speechSupported}
              className={`rounded-full px-4 py-2 text-xs font-bold disabled:opacity-40 ${
                listening ? "bg-rose-600 animate-pulse" : "bg-white/15 hover:bg-white/25"
              }`}
            >
              {listening ? "● Listening" : "Start"}
            </button>
          </div>
          {transcript && (
            <p className="mt-2 max-h-16 overflow-hidden text-[11px] italic text-white/50">
              …{transcript.slice(-180)}
            </p>
          )}
        </div>

        {/* focus */}
        <p className="mt-4 mb-1 text-[11px] font-bold uppercase tracking-wider text-white/40">
          Focus
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {FOCUS.map((f) => (
            <button
              key={f.key}
              onClick={() => run(`focus-${f.key}`, () => onConfig({ focus: f.key }))}
              disabled={busy !== null}
              className={`rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                sim.focus === f.key
                  ? "bg-fuchsia-500/30 ring-1 ring-fuchsia-400"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        {/* pace */}
        <p className="mt-4 mb-1 text-[11px] font-bold uppercase tracking-wider text-white/40">
          Pace
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {PACE.map((p) => (
            <button
              key={p.key}
              onClick={() => run(`pace-${p.key}`, () => onConfig({ pace: p.key }))}
              disabled={busy !== null}
              className={`rounded-xl px-2 py-2 text-left transition ${
                sim.pace === p.key
                  ? "bg-fuchsia-500/30 ring-1 ring-fuchsia-400"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <span className="block text-[11px] font-semibold">{p.label}</span>
              <span className="block text-[10px] text-white/50">{p.hint}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => run("burst", onBurst)}
            disabled={busy !== null || !sim.enabled}
            className="rounded-full bg-white/10 py-2.5 text-xs font-semibold hover:bg-white/20 disabled:opacity-40"
          >
            {busy === "burst" ? "Sending…" : "🌊 Send a wave now"}
          </button>
          <button
            onClick={() => run("clear", onClear)}
            disabled={busy !== null}
            className="rounded-full bg-white/5 py-2.5 text-xs font-semibold text-rose-300 hover:bg-white/10 disabled:opacity-40"
          >
            {busy === "clear" ? "Clearing…" : "🧹 Clear simulated comments"}
          </button>
        </div>

        <p className="mt-4 rounded-xl bg-white/5 px-3 py-2 text-[10px] leading-relaxed text-white/50">
          Real people can comment at any time, exactly as normal.
        </p>
      </div>
    </div>
  );
}
