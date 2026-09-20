"use client";

import { useEffect, useState } from "react";

const PRESETS = [20, 50, 100, 200, 500];

export default function OfferingButton({
  code,
  defaultName,
}: {
  code: string;
  defaultName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName ?? "");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("50");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const offering = params.get("offering");
    queueMicrotask(() => {
      if (offering === "success") setNote("Thank you. Your seed has been received. God bless you.");
      if (offering === "pending") setNote("Payment is processing. The admin will see it when Paystack confirms.");
      if (offering === "error") setNote("We could not confirm that payment. Please try again.");
    });
  }, []);

  const give = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/offerings/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, amount: Number(amount), code }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; authorizationUrl?: string };
      if (!res.ok || !data.authorizationUrl) {
        setError(data.error ?? "Could not open Paystack.");
        return;
      }
      window.location.assign(data.authorizationUrl);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-2 text-xs font-black text-black shadow-[0_0_16px_rgba(251,191,36,0.45)]"
      >
        🌾 Sow a seed/offering
      </button>
      {note && <p className="mt-2 text-center text-[11px] text-amber-200">{note}</p>}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl border border-white/10 bg-zinc-950 p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Sow a seed/offering</h2>
            <p className="mt-1 text-xs text-white/50">
              Give securely through Paystack. Card, mobile money or bank transfer.
            </p>
            <div className="mt-4 space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (for receipt)"
                type="email"
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAmount(String(n))}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      amount === String(n) ? "bg-amber-400 text-black" : "bg-white/10"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="Amount"
                inputMode="decimal"
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            </div>
            {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
            <button
              type="button"
              disabled={busy}
              onClick={() => void give()}
              className="mt-4 w-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 py-3 text-sm font-black text-black disabled:opacity-50"
            >
              {busy ? "Opening Paystack…" : "Continue to Paystack"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 w-full rounded-full bg-white/10 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
