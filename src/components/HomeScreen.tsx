"use client";

import AdSlider from "@/components/AdSlider";
import BrandMark from "@/components/BrandMark";
import { useBrand, type BrandInfo } from "@/lib/useBrand";
import type { StreamSummary } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomeScreen({ initialBrand }: { initialBrand: BrandInfo }) {
  const router = useRouter();
  const [live, setLive] = useState<StreamSummary[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const { brand } = useBrand(initialBrand);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        await fetch("/api/streams", { method: "PATCH" });
        const res = await fetch("/api/streams", { cache: "no-store" });
        const data = (await res.json()) as { streams: StreamSummary[] };
        if (alive) setLive(data.streams ?? []);
      } catch {
        /* ignore */
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <main className="min-h-dvh bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-white">
      <div className="mx-auto w-full max-w-5xl px-5 py-10">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-3">
          <BrandMark brand={brand} size="md" />
          <div className="flex items-center gap-2">
            <a
              href="/admin"
              className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
              title="Admin dashboard"
            >
              🔐 Admin
            </a>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.trim().toLowerCase())}
              placeholder="room code"
              className="w-28 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-xs outline-none focus:border-fuchsia-400"
            />
            <button
              onClick={() => joinCode && router.push(`/live/${joinCode}`)}
              className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20"
            >
              Join
            </button>
          </div>
        </header>

        <section className="mb-12">
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">
            {brand.name}
            <br />
            <span className="bg-gradient-to-r from-amber-300 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
              {brand.tagline}
            </span>
          </h1>
          <p className="mt-4 text-sm text-white/60">
            Watch the service, comment in real time, and request to come on stage when the
            host invites you.
          </p>
          <div className="relative mt-6 overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/brand/home-banner?v=${brand.homeBannerVersion || 0}`}
              alt={`${brand.name} program banner`}
              className="aspect-[16/7] w-full object-cover sm:aspect-[21/8]"
              onError={(e) => {
                const el = e.currentTarget;
                el.style.display = "none";
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
            <div className="absolute bottom-3 left-4 right-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">
                Program banner
              </p>
              <p className="truncate text-sm font-semibold sm:text-base">{brand.name}</p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">
              Live right now
            </h2>
          </div>
          {live.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">
              No live service at the moment. Check back soon.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((s) => (
                <button
                  key={s.code}
                  onClick={() => router.push(`/live/${s.code}`)}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-800 to-black text-left transition hover:border-fuchsia-400/60"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/40">
                    {s.hasCover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/streams/${s.code}/cover?v=${s.coverVersion}`}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_30%,rgba(217,70,239,0.35),transparent_60%)] text-3xl">
                        {s.mode === "video" ? "📹" : "🎙️"}
                      </div>
                    )}
                    <span
                      className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        s.phase === "onair" ? "bg-rose-600" : "bg-violet-600"
                      }`}
                    >
                      {s.phase === "onair" ? "live" : "soon"}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="truncate font-semibold">{s.title}</p>
                    <p className="mt-1 text-xs text-white/50">
                      {s.hostName} ·{" "}
                      {s.phase === "onair"
                        ? `${s.viewers} watching · ${s.onStage} on stage`
                        : (s.scheduledFor ?? `${s.viewers} waiting`)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <AdSlider />
      </div>
    </main>
  );
}
