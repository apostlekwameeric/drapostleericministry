"use client";

import { useBrand } from "@/lib/useBrand";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  code: string;
  title: string;
  hostName: string;
  mode: "video" | "audio";
  coverVersion?: number;
};

type Toast = { text: string; tone: "ok" | "warn" } | null;

export default function ShareSheet({
  open,
  onClose,
  code,
  title,
  hostName,
  mode,
  coverVersion = 0,
}: Props) {
  const [origin, setOrigin] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [bannerOk, setBannerOk] = useState(true);
  const { brand } = useBrand();

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.canShare) return;
    try {
      const probe = new File([new Blob(["x"], { type: "image/png" })], "p.png", {
        type: "image/png",
      });
      setCanShareFiles(navigator.canShare({ files: [probe] }));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  const joinUrl = origin ? `${origin}/live/${code}` : `/live/${code}`;
  const bannerUrl = `/api/streams/${code}/banner?format=story&v=${coverVersion}`;

  const message = useMemo(
    () =>
      [
        `🔴 LIVE NOW — ${title}`,
        "",
        `${brand.name} · ${hostName} is streaming ${
          mode === "audio" ? "an audio room" : "on video"
        }.`,
        "Join to watch, drop comments, or ask to come on stage with your audio or video.",
        "",
        `👉 Join here: ${joinUrl}`,
        `🔑 Room code: ${code.toUpperCase()}`,
      ].join("\n"),
    [title, hostName, mode, joinUrl, code, brand.name],
  );

  const flash = useCallback((text: string, tone: "ok" | "warn" = "ok") => {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 2200);
  }, []);

  const copy = useCallback(
    async (value: string, label: string) => {
      try {
        await navigator.clipboard.writeText(value);
        flash(`${label} copied ✓`);
      } catch {
        flash("Copy failed — long-press to copy", "warn");
      }
    },
    [flash],
  );

  const fetchBannerFile = useCallback(async () => {
    const res = await fetch(bannerUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("banner failed");
    const blob = await res.blob();
    const slug =
      brand.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "live";
    return new File([blob], `${slug}-${code}.png`, { type: "image/png" });
  }, [bannerUrl, code, brand.name]);

  /** Native share sheet: sends the banner image + text + link together. */
  const shareEverywhere = useCallback(async () => {
    setBusy("native");
    try {
      if (canShareFiles) {
        try {
          const file = await fetchBannerFile();
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title, text: message });
            return;
          }
        } catch {
          /* fall through to plain share */
        }
      }
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text: message, url: joinUrl });
        return;
      }
      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener",
      );
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        flash("Sharing was cancelled", "warn");
      }
    } finally {
      setBusy(null);
    }
  }, [canShareFiles, fetchBannerFile, flash, joinUrl, message, title]);

  /** WhatsApp specifically: image to the clipboard/downloads + prefilled chat text. */
  const shareToWhatsApp = useCallback(async () => {
    setBusy("whatsapp");
    try {
      if (canShareFiles) {
        try {
          const file = await fetchBannerFile();
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title, text: message });
            return;
          }
        } catch {
          /* ignore and fall back to the wa.me deep link */
        }
      }
      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener",
      );
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(message)}`,
          "_blank",
          "noopener",
        );
      }
    } finally {
      setBusy(null);
    }
  }, [canShareFiles, fetchBannerFile, message, title]);

  const downloadBanner = useCallback(async () => {
    setBusy("download");
    try {
      const file = await fetchBannerFile();
      const href = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = href;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 4000);
      flash("Banner saved — post it as a status 🎉");
    } catch {
      flash("Could not build the banner", "warn");
    } finally {
      setBusy(null);
    }
  }, [fetchBannerFile, flash]);

  if (!open) return null;

  const targets = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      emoji: "💬",
      className: "bg-[#25D366]/20 text-[#7ef0ab] hover:bg-[#25D366]/30",
      onClick: shareToWhatsApp,
    },
    {
      key: "telegram",
      label: "Telegram",
      emoji: "✈️",
      className: "bg-sky-500/20 text-sky-200 hover:bg-sky-500/30",
      href: `https://t.me/share/url?url=${encodeURIComponent(
        joinUrl,
      )}&text=${encodeURIComponent(message)}`,
    },
    {
      key: "x",
      label: "X",
      emoji: "𝕏",
      className: "bg-white/10 text-white hover:bg-white/20",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
    },
    {
      key: "facebook",
      label: "Facebook",
      emoji: "📘",
      className: "bg-blue-600/20 text-blue-200 hover:bg-blue-600/30",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(joinUrl)}`,
    },
    {
      key: "sms",
      label: "SMS",
      emoji: "📱",
      className: "bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25",
      href: `sms:?&body=${encodeURIComponent(message)}`,
    },
    {
      key: "email",
      label: "Email",
      emoji: "✉️",
      className: "bg-amber-500/15 text-amber-200 hover:bg-amber-500/25",
      href: `mailto:?subject=${encodeURIComponent(
        `🔴 LIVE: ${title}`,
      )}&body=${encodeURIComponent(message)}`,
    },
  ];

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
            <h2 className="text-lg font-bold">Invite people to your live</h2>
            <p className="text-xs text-white/50">
              Share the banner, the link and the code in one tap.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70"
          >
            ✕
          </button>
        </div>

        {/* banner preview */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-500/20 to-rose-500/10">
          {bannerOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/streams/${code}/banner?format=og&v=${coverVersion}`}
              alt="Live program banner"
              className="w-full"
              onError={() => setBannerOk(false)}
            />
          ) : (
            <div className="p-6 text-center text-xs text-white/50">
              Banner preview unavailable
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            program banner
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={shareEverywhere}
            disabled={busy !== null}
            className="rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 py-3 text-sm font-bold disabled:opacity-50"
          >
            {busy === "native" ? "Opening…" : "📤 Share banner + link"}
          </button>
          <button
            onClick={downloadBanner}
            disabled={busy !== null}
            className="rounded-full bg-white/10 py-3 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
          >
            {busy === "download" ? "Saving…" : "⬇️ Save banner"}
          </button>
        </div>

        {/* share targets */}
        <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-white/40">
          Send to
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {targets.map((t) =>
            t.href ? (
              <a
                key={t.key}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col items-center gap-1 rounded-2xl py-3 text-xs font-semibold transition ${t.className}`}
              >
                <span className="text-xl">{t.emoji}</span>
                {t.label}
              </a>
            ) : (
              <button
                key={t.key}
                onClick={t.onClick}
                disabled={busy !== null}
                className={`flex flex-col items-center gap-1 rounded-2xl py-3 text-xs font-semibold transition disabled:opacity-50 ${t.className}`}
              >
                <span className="text-xl">{t.emoji}</span>
                {busy === "whatsapp" ? "Opening…" : t.label}
              </button>
            ),
          )}
        </div>

        {/* link + code */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2 rounded-2xl bg-black/60 p-2">
            <span className="min-w-0 flex-1 truncate px-2 text-xs text-white/70">
              {joinUrl}
            </span>
            <button
              onClick={() => copy(joinUrl, "Link")}
              className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
            >
              Copy link
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-black/60 p-2">
            <span className="min-w-0 flex-1 px-2 font-mono text-sm font-bold tracking-[0.3em] text-fuchsia-300">
              {code.toUpperCase()}
            </span>
            <button
              onClick={() => copy(code, "Code")}
              className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
            >
              Copy code
            </button>
          </div>
          <button
            onClick={() => copy(message, "Invite message")}
            className="w-full rounded-2xl bg-white/5 py-2 text-xs font-semibold text-white/60 hover:bg-white/10"
          >
            Copy full invite message
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-white/35">
          Anyone with the link can watch and comment, and can request to join with audio
          or video.
        </p>

        {toast && (
          <div
            className={`mt-3 rounded-xl px-3 py-2 text-center text-xs ${
              toast.tone === "ok"
                ? "bg-emerald-500/15 text-emerald-200"
                : "bg-amber-500/15 text-amber-100"
            }`}
          >
            {toast.text}
          </div>
        )}
      </div>
    </div>
  );
}
