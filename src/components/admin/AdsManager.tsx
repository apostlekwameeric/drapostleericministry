"use client";

import { adminHeaders, getAdminToken } from "@/lib/adminApi";
import { prepareImage, uploadImage } from "@/lib/clientImage";
import { useEffect, useRef, useState } from "react";

type Slot = { slot: number; version: number; url: string; isCustom?: boolean };

export default function AdsManager({
  notify,
}: {
  notify: (text: string, tone?: "ok" | "warn") => void;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const inputs = useRef<Record<number, HTMLInputElement | null>>({});

  const load = async () => {
    const res = await fetch("/api/ads", { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as { slots?: Slot[] };
    setSlots(data.slots ?? []);
  };

  useEffect(() => {
    const t = setInterval(() => void load(), 15000);
    queueMicrotask(() => void load());
    return () => clearInterval(t);
  }, []);

  const filled = new Map(slots.map((s) => [s.slot, s]));

  const upload = async (slot: number, file: File) => {
    setBusy(slot);
    try {
      const prepared = await prepareImage(file, { maxEdge: 1600, preferJpeg: true });
      const outcome = await uploadImage(
        `/api/ads/${slot}`,
        prepared.blob,
        { adminToken: getAdminToken() ?? "" },
        `ad-${slot}`,
        adminHeaders(),
      );
      URL.revokeObjectURL(prepared.previewUrl);
      if (!outcome.ok) notify(outcome.error, "warn");
      else {
        notify(`Ad ${slot} updated successfully!`);
        await load();
      }
    } catch {
      notify("Could not read that image", "warn");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (slot: number) => {
    setBusy(slot);
    try {
      const res = await fetch(`/api/ads/${slot}`, {
        method: "DELETE",
        headers: adminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ adminToken: getAdminToken() ?? "" }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) notify(data.error ?? "Could not reset", "warn");
      else {
        notify(`Ad ${slot} reset to default`);
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">Homepage Advertisements (9 Slots)</h3>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white/70">
          Slides every 10 seconds
        </span>
      </div>
      <p className="mb-4 text-xs text-white/50">
        All 9 slots have high-quality default images ready. You can replace any of the 9 slides with your own custom flyers, announcements, or ministry banners at any time.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
        {Array.from({ length: 9 }, (_, i) => i + 1).map((slot) => {
          const item = filled.get(slot);
          const isCustom = Boolean(item?.isCustom);
          return (
            <div key={slot} className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/40">
              <div className="relative aspect-[4/3] w-full bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item?.url ?? `/api/ads/${slot}?v=0`}
                  alt={`Ad ${slot}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  #{slot}
                </span>
                {isCustom && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-emerald-500/80 px-1 py-0.5 text-[8px] font-bold text-black uppercase">
                    Custom
                  </span>
                )}
              </div>
              <input
                ref={(el) => {
                  inputs.current[slot] = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void upload(slot, file);
                }}
              />
              <div className="flex border-t border-white/10 bg-white/5">
                <button
                  type="button"
                  disabled={busy === slot}
                  onClick={() => inputs.current[slot]?.click()}
                  className="flex-1 py-2 text-[10px] font-bold text-fuchsia-300 hover:bg-white/10 disabled:opacity-40"
                >
                  {busy === slot ? "…" : isCustom ? "Replace" : "Change"}
                </button>
                {isCustom && (
                  <button
                    type="button"
                    disabled={busy === slot}
                    title="Reset to default image"
                    onClick={() => void remove(slot)}
                    className="border-l border-white/10 px-2 py-2 text-[10px] font-bold text-rose-300 hover:bg-rose-500/20"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
