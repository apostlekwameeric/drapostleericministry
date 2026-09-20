"use client";

import BrandMark from "@/components/BrandMark";
import { loginWithPin } from "@/lib/adminApi";
import type { BrandInfo } from "@/lib/useBrand";
import { useCallback, useEffect, useState } from "react";

type Props = { brand: BrandInfo; onUnlocked: (defaultPin: boolean) => void };

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"];

export default function PinGate({ brand, onUnlocked }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);

  const submit = useCallback(
    async (value: string) => {
      if (value.length < 4 || busy) return;
      setBusy(true);
      setError(null);
      try {
        const result = await loginWithPin(value);
        if (!result.ok) {
          setError(result.error ?? "Wrong PIN");
          setShake(true);
          setTimeout(() => setShake(false), 450);
          setPin("");
          return;
        }
        onUnlocked(Boolean(result.defaultPin));
      } finally {
        setBusy(false);
      }
    },
    [busy, onUnlocked],
  );

  const press = useCallback(
    (key: string) => {
      setError(null);
      if (key === "⌫") {
        setPin((p) => p.slice(0, -1));
        return;
      }
      if (key === "OK") {
        void submit(pin);
        return;
      }
      setPin((p) => {
        if (p.length >= 8) return p;
        const next = p + key;
        if (next.length === 4) setTimeout(() => void submit(next), 120);
        return next;
      });
    },
    [pin, submit],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("⌫");
      else if (e.key === "Enter") press("OK");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [press]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-6 text-white">
      <div className="w-full max-w-xs">
        <BrandMark brand={brand} size="lg" className="mb-6 justify-center" />
        <h1 className="text-center text-lg font-bold">Admin dashboard</h1>
        <p className="mt-1 text-center text-xs text-white/50">Enter your PIN to continue</p>

        <div className={`mt-6 flex justify-center gap-3 ${shake ? "animate-[shake_.4s]" : ""}`}>
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full transition ${
                i < pin.length
                  ? "bg-gradient-to-br from-fuchsia-400 to-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)]"
                  : "bg-white/15"
              }`}
            />
          ))}
        </div>

        {error && <p className="mt-3 text-center text-xs text-rose-300">{error}</p>}

        <div className="mt-6 grid grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              disabled={busy}
              className={`h-14 rounded-2xl text-lg font-semibold transition active:scale-95 disabled:opacity-50 ${
                key === "OK"
                  ? "bg-gradient-to-r from-fuchsia-500 to-rose-500 text-sm font-bold"
                  : key === "⌫"
                    ? "bg-white/5 text-white/70 hover:bg-white/10"
                    : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] text-white/30">
          Only the ministry admin should have this PIN.
        </p>
      </div>

      <style>{`@keyframes shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-6px)}40%,60%{transform:translateX(6px)}}`}</style>
    </main>
  );
}
