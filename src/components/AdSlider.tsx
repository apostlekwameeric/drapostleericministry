"use client";

import { useEffect, useState } from "react";

type Slot = { slot: number; version: number; url: string };

export default function AdSlider() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      fetch("/api/ads", { cache: "no-store" })
        .then((r) => r.json())
        .then((data: { slots?: Slot[] }) => {
          if (alive) setSlots(data.slots ?? []);
        })
        .catch(() => undefined);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (slots.length < 2) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slots.length);
    }, 30_000);
    return () => clearInterval(t);
  }, [slots.length]);

  if (slots.length === 0) return null;
  const current = slots[index] ?? slots[0];

  return (
    <section className="mt-12">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
        Advertisement
      </p>
      <div className="relative min-h-[280px] overflow-hidden rounded-3xl border border-white/10 bg-black sm:min-h-[380px]">
        {slots.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${s.slot}-${s.version}`}
            src={s.url}
            alt={`Advertisement ${s.slot}`}
            className={`h-[280px] w-full object-contain transition-opacity duration-700 sm:h-[380px] ${
              i === index ? "relative opacity-100" : "absolute inset-0 opacity-0"
            }`}
          />
        ))}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {slots.map((s, i) => (
            <button
              key={s.slot}
              type="button"
              aria-label={`Show ad ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition ${
                i === index ? "w-6 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-white/30">
        {current.slot} of {slots.length} · slides every 30 seconds
      </p>
    </section>
  );
}
