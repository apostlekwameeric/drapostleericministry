"use client";

import { adminHeaders, getAdminToken } from "@/lib/adminApi";
import { prepareImage, uploadImage } from "@/lib/clientImage";
import { useEffect, useRef, useState } from "react";

type Slot = { slot: number; version: number; url: string };

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
        notify(`Ad ${slot} saved`);
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
      if (!res.ok || data.ok === false) notify(data.error ?? "Could not remove", "warn");
      else {
        notify(`Ad ${slot} removed`);
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-2">
      <h3 className="text-sm font-bold">Homepage advertisements</h3>
      <p className="mb-4 text-xs text-white/50">
        Upload up to 9 images. They slide every 30 seconds at the bottom of the public site.
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-9">
        {Array.from({ length: 9 }, (_, i) => i + 1).map((slot) => {
          const item = filled.get(slot);
          return (
            <div key={slot} className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
              <div className="relative aspect-[4/3] w-full bg-black">
                {item ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={`Ad ${slot}`} className="h-full w-full object-contain" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-xs text-white/30">
                    {slot}
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
              <div className="flex">
                <button
                  type="button"
                  disabled={busy === slot}
                  onClick={() => inputs.current[slot]?.click()}
                  className="flex-1 py-1.5 text-[10px] font-semibold hover:bg-white/10 disabled:opacity-40"
                >
                  {busy === slot ? "…" : item ? "Replace" : "Upload"}
                </button>
                {item && (
                  <button
                    type="button"
                    disabled={busy === slot}
                    onClick={() => void remove(slot)}
                    className="px-2 py-1.5 text-[10px] font-semibold text-rose-300 hover:bg-white/10"
                  >
                    ✕
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
