"use client";

import { useEffect, useState } from "react";

type Slot = { slot: number; version: number; url: string; isCustom?: boolean };

export default function AdSlider() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      fetch("/api/ads", { cache: "no-store" })
        .then((r) => r.json())
        .then((data: { slots?: Slot[] }) => {
          if (alive && data.slots && data.slots.length > 0) {
            setSlots(data.slots);
          }
        })
        .catch(() => undefined);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Slide every 10 seconds (10,000 ms) as requested
  useEffect(() => {
    if (slots.length < 2) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slots.length);
    }, 10_000);
    return () => clearInterval(t);
  }, [slots.length]);

  if (slots.length === 0) return null;
  const current = slots[index] ?? slots[0];

  return (
    <section className="mt-12">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
          Advertisement
        </p>
        <span className="text-[10px] text-white/40 font-mono">
          Slides every 10s · {index + 1} of {slots.length}
        </span>
      </div>
      <div className="relative min-h-[300px] overflow-hidden rounded-3xl border border-white/10 bg-black sm:min-h-[400px]">
        {slots.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${s.slot}-${s.version}`}
            src={s.url}
            alt={`Advertisement ${s.slot}`}
            className={`h-[300px] w-full object-contain transition-opacity duration-700 sm:h-[400px] ${
              i === index ? "relative opacity-100" : "absolute inset-0 opacity-0 pointer-events-none"
            }`}
          />
        ))}

        {/* Carousel indicators */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
          {slots.map((s, i) => (
            <button
              key={s.slot}
              type="button"
              aria-label={`Show ad ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-7 bg-amber-400 shadow-md" : "w-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-white/35">
        Slide {current.slot} of {slots.length} · Auto-advancing every 10 seconds
      </p>
    </section>
  );
}
