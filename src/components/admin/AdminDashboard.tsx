"use client";

import AudienceControl from "@/components/admin/AudienceControl";
import OfferingsPanel from "@/components/admin/OfferingsPanel";
import ChatModeration from "@/components/admin/ChatModeration";
import PeoplePanel from "@/components/admin/PeoplePanel";
import PinGate from "@/components/admin/PinGate";
import SettingsPanel from "@/components/admin/SettingsPanel";
import StreamDeck from "@/components/admin/StreamDeck";
import BrandMark from "@/components/BrandMark";
import {
  adminAction,
  checkSession,
  fetchOverview,
  getAdminToken,
  logoutAdmin,
  type AdminRoom,
  type Overview,
} from "@/lib/adminApi";
import { saveIdentity } from "@/lib/identity";
import type { Identity, PublicMessage } from "@/lib/types";
import { publishBrand, useBrand, type BrandInfo } from "@/lib/useBrand";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Tab = "stream" | "people" | "chat" | "audience" | "offerings" | "settings";

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: "stream", label: "Stream", emoji: "🎛️" },
  { key: "people", label: "People", emoji: "👥" },
  { key: "chat", label: "Chat", emoji: "💬" },
  { key: "audience", label: "Audience", emoji: "✦" },
  { key: "offerings", label: "Offerings", emoji: "🌾" },
  { key: "settings", label: "Settings", emoji: "⚙️" },
];

export default function AdminDashboard({ initialBrand }: { initialBrand: BrandInfo }) {
  const { brand } = useBrand(initialBrand);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [focusCode, setFocusCode] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("stream");
  const [chat, setChat] = useState<PublicMessage[]>([]);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newHost, setNewHost] = useState("");
  const [newMode, setNewMode] = useState<"video" | "audio">("video");
  const [newTagline, setNewTagline] = useState("");
  const [newWhen, setNewWhen] = useState("");
  const lastChatIdRef = useRef(0);
  const chatCodeRef = useRef<string | null>(null);
  const authedRef = useRef(false);

  const notify = useCallback((text: string, tone: "ok" | "warn" = "ok") => {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (getAdminToken()) {
      authedRef.current = true;
      queueMicrotask(() => setAuthed(true));
      return;
    }
    checkSession().then(({ authenticated }) => {
      if (cancelled || authedRef.current) return;
      authedRef.current = authenticated;
      setAuthed(authenticated);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!authedRef.current) return;
    const since = chatCodeRef.current === focusCode ? lastChatIdRef.current : 0;
    const data = await fetchOverview(focusCode, since);
    if (data === undefined || data === null) return; // keep the dashboard open even if a poll fails
    setOverview(data);
    if (data.brand) publishBrand(data.brand);
    if (data.focusCode !== focusCode) setFocusCode(data.focusCode);
    if (chatCodeRef.current !== data.focusCode) {
      chatCodeRef.current = data.focusCode;
      lastChatIdRef.current = 0;
      setChat(data.chat);
    } else if (data.chat.length > 0) {
      setChat((prev) => {
        const known = new Set(prev.map((m) => m.id));
        const fresh = data.chat.filter((m) => !known.has(m.id));
        return [...prev, ...fresh];
      });
    }
    if (data.chat.length > 0) {
      lastChatIdRef.current = Math.max(lastChatIdRef.current, data.chat[data.chat.length - 1].id);
    }
  }, [focusCode]);

  useEffect(() => {
    if (!authed) return;
    const timer = setInterval(() => void refresh(), 2500);
    const kick = setTimeout(() => void refresh(), 0);
    return () => {
      clearInterval(timer);
      clearTimeout(kick);
    };
  }, [authed, refresh]);

  const logout = async () => {
    await logoutAdmin();
    authedRef.current = false;
    setAuthed(false);
    setOverview(null);
  };

  const createRoom = async () => {
    setCreating(true);
    const result = await adminAction({
      action: "create-room",
      hostName: newHost.trim() || brand.name.split(" ").slice(0, 2).join(" ") || "Host",
      title: newTitle.trim(),
      mode: newMode,
      tagline: newTagline.trim(),
      scheduledFor: newWhen.trim(),
    });
    setCreating(false);
    if (!result.ok || !result.code) {
      const errMsg = result.error || "Could not create the room. Please check connection and try again.";
      notify(errMsg, "warn");
      return;
    }
    const identity: Identity = {
      code: String(result.code),
      participantId: Number(result.participantId),
      token: String(result.token),
      name: String(result.name),
      role: "host",
    };
    saveIdentity(identity);
    setNewTitle("");
    setNewTagline("");
    setNewWhen("");
    setFocusCode(identity.code);
    chatCodeRef.current = null;
    notify(`Room #${identity.code.toUpperCase()} created successfully!`);
    await refresh();
  };

  if (authed === null) {
    return <main className="flex min-h-dvh items-center justify-center bg-black text-white/50">Loading…</main>;
  }

  if (!authed) {
    return (
      <PinGate
        brand={brand}
        onUnlocked={() => {
          authedRef.current = true;
          setAuthed(true);
          setTab("stream");
        }}
      />
    );
  }

  const rooms = (overview?.rooms ?? []).filter((r) => r.status !== "ended");
  const liveRooms = rooms;
  const room: AdminRoom | null = rooms.find((r) => r.code === focusCode) ?? liveRooms[0] ?? null;
  const pendingRequests = room?.participants.filter((p) => p.requestState === "pending").length ?? 0;
  const clearedAtId = room?.sim.clearedAtId ?? 0;
  const visibleChat =
    clearedAtId > 0 ? chat.filter((m) => !(m.origin === "sim" && m.id <= clearedAtId)) : chat;

  return (
    <main className="min-h-dvh bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <BrandMark brand={brand} size="sm" />
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/60">
            admin
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">
              Public site ↗
            </Link>
            <button onClick={logout} className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/10">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5">
        {overview?.defaultPin && tab !== "settings" && (
          <button onClick={() => setTab("settings")} className="mb-4 w-full rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-left text-[11px] text-amber-100">
            ⚠️ You are using the starting PIN 7772 — tap here to change it.
          </button>
        )}

        {/* room picker */}
        <section className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold">Rooms</h2>
            <span className="text-[11px] text-white/40">{liveRooms.length} open</span>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {rooms.slice(0, 12).map((r) => (
              <button
                key={r.code}
                onClick={() => {
                  setFocusCode(r.code);
                  chatCodeRef.current = null;
                }}
                className={`flex min-w-[190px] shrink-0 flex-col gap-1 rounded-xl border p-3 text-left transition ${
                  room?.code === r.code ? "border-fuchsia-400 bg-fuchsia-500/15" : "border-white/10 bg-black/40 hover:border-white/30"
                }`}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                  <span className={`h-2 w-2 rounded-full ${r.status === "ended" ? "bg-white/30" : r.phase === "onair" ? "bg-rose-500" : "bg-violet-400"}`} />
                  {r.status === "ended" ? "ended" : r.phase === "onair" ? "on air" : "backstage"}
                  {r.sim.enabled && <span className="ml-auto text-violet-300">✦</span>}
                </span>
                <span className="truncate text-sm font-semibold">{r.title}</span>
                <span className="text-[11px] text-white/50">
                  {r.hostName} · {r.viewers} in room · {r.code.toUpperCase()}
                </span>
              </button>
            ))}
            <div className="flex min-w-[260px] shrink-0 flex-col gap-2 rounded-xl border border-dashed border-white/20 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Start a live service</span>
              <input value={newHost} onChange={(e) => setNewHost(e.target.value)} placeholder="Host name" maxLength={32} className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs outline-none focus:border-fuchsia-400" />
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Live title (optional)" maxLength={80} className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs outline-none focus:border-fuchsia-400" />
              <input value={newTagline} onChange={(e) => setNewTagline(e.target.value)} placeholder="Tagline (optional)" maxLength={120} className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs outline-none focus:border-fuchsia-400" />
              <input value={newWhen} onChange={(e) => setNewWhen(e.target.value)} placeholder="Starts at (e.g. Tonight 8PM)" maxLength={60} className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs outline-none focus:border-fuchsia-400" />
              <div className="flex gap-1">
                {(["video", "audio"] as const).map((m) => (
                  <button key={m} onClick={() => setNewMode(m)} className={`flex-1 rounded-lg py-1 text-[11px] font-semibold ${newMode === m ? "bg-fuchsia-500/30 ring-1 ring-fuchsia-400" : "bg-white/5"}`}>
                    {m === "video" ? "📹 Video live" : "🎙️ Audio live"}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-white/40">You will land backstage first to upload a banner and invite people.</p>
              <button onClick={createRoom} disabled={creating} className="rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 py-1.5 text-xs font-bold disabled:opacity-50">
                {creating ? "Creating…" : "Create live room"}
              </button>
            </div>
          </div>
        </section>

        {!room && tab !== "offerings" && tab !== "settings" ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-white/40">
            No rooms yet. Create one above, then open it as host on the phone that will stream.
          </p>
        ) : (
          <>
            <nav className="mb-4 flex gap-1 overflow-x-auto rounded-full bg-white/5 p-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`relative flex-1 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition ${
                    tab === t.key ? "bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white" : "text-white/60 hover:bg-white/10"
                  }`}
                >
                  {t.emoji} {t.label}
                  {t.key === "people" && room && pendingRequests > 0 && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-1.5 text-[9px] font-bold text-black">{pendingRequests}</span>
                  )}
                  {t.key === "audience" && room?.sim.enabled && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
                  )}
                </button>
              ))}
            </nav>

            {tab === "stream" && room && <StreamDeck room={room} onChanged={refresh} notify={notify} />}
            {tab === "people" && room && <PeoplePanel room={room} onChanged={refresh} notify={notify} />}
            {tab === "chat" && room && <ChatModeration room={room} messages={visibleChat} onChanged={refresh} notify={notify} />}
            {tab === "audience" && room && <AudienceControl room={room} onChanged={refresh} notify={notify} />}
            {tab === "offerings" && <OfferingsPanel />}
            {tab === "settings" && (
              <SettingsPanel
                brand={brand}
                defaultPin={Boolean(overview?.defaultPin)}
                onBrandSaved={(b) => {
                  publishBrand(b);
                  notify("Branding saved");
                }}
                notify={notify}
                onLogout={logout}
              />
            )}
          </>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold shadow-xl backdrop-blur ${toast.tone === "ok" ? "border border-emerald-400/30 bg-emerald-500/20 text-emerald-100" : "border border-amber-400/30 bg-amber-500/20 text-amber-100"}`}>
          {toast.text}
        </div>
      )}
    </main>
  );
}
