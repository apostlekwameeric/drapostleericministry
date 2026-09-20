"use client";

import BrandMark from "@/components/BrandMark";
import { adminHeaders, getAdminToken } from "@/lib/adminApi";
import { prepareImage, uploadImage, type PreparedImage } from "@/lib/clientImage";
import { brandLogoSrc, publishBrand, type BrandInfo } from "@/lib/useBrand";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  brand: BrandInfo;
  onClose: () => void;
  onSaved?: (brand: BrandInfo) => void;
};

type Stage = "idle" | "reading" | "uploading" | "saved";

export default function BrandSettings({ open, brand, onClose, onSaved }: Props) {
  const [name, setName] = useState(brand.name);
  const [tagline, setTagline] = useState(brand.tagline);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const preparedRef = useRef<PreparedImage | null>(null);

  const resetPicked = useCallback(() => {
    if (preparedRef.current) URL.revokeObjectURL(preparedRef.current.previewUrl);
    preparedRef.current = null;
    setPrepared(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    setName(brand.name);
    setTagline(brand.tagline);
    setError(null);
    setStage("idle");
    return () => resetPicked();
  }, [open, brand.name, brand.tagline, resetPicked]);

  const choose = useCallback(
    async (file: File) => {
      setError(null);
      setStage("reading");
      try {
        const next = await prepareImage(file, { maxEdge: 512 });
        if (!next.mime.startsWith("image/")) {
          URL.revokeObjectURL(next.previewUrl);
          setError("That does not look like an image. Please choose a PNG or JPG logo.");
          return;
        }
        if (preparedRef.current) URL.revokeObjectURL(preparedRef.current.previewUrl);
        preparedRef.current = next;
        setPrepared(next);
      } catch {
        setError("Could not read that file. Please pick it again.");
      } finally {
        setStage("idle");
      }
    },
    [],
  );

  const save = async () => {
    setError(null);
    setStage("uploading");
    const image = preparedRef.current?.blob ?? null;
    const outcome = await uploadImage<{ ok: boolean; brand: BrandInfo }>(
      "/api/brand",
      image,
        { name, tagline, adminToken: getAdminToken() ?? "" },
      "logo",
      adminHeaders(),
    );
    if (!outcome.ok) {
      setStage("idle");
      setError(outcome.error);
      return;
    }
    publishBrand(outcome.data.brand);
    onSaved?.(outcome.data.brand);
    setStage("saved");
    setTimeout(() => {
      setStage("idle");
      onClose();
    }, 700);
  };

  const removeLogo = async () => {
    setError(null);
    setStage("uploading");
    try {
      const res = await fetch("/api/brand", {
        method: "DELETE",
        cache: "no-store",
        headers: adminHeaders(),
      });
      const data = (await res.json().catch(() => ({}))) as {
        brand?: BrandInfo;
        error?: string;
      };
      if (!res.ok || !data.brand) {
        setError(data.error ?? "Could not remove the logo.");
        return;
      }
      publishBrand(data.brand);
      resetPicked();
    } catch {
      setError("Network problem while removing the logo.");
    } finally {
      setStage("idle");
    }
  };

  if (!open) return null;

  const busy = stage === "reading" || stage === "uploading";
  const currentLogo = prepared?.previewUrl ?? brandLogoSrc(brand);
  const saveLabel =
    stage === "uploading"
      ? "Saving…"
      : stage === "saved"
        ? "Saved ✓"
        : prepared
          ? "Save logo & details"
          : "Save details";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-zinc-950 p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Ministry branding</h2>
            <p className="text-xs text-white/50">
              Your logo and name appear in the app, on banners and in shared links.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,.svg,.heic,.heif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void choose(file);
          }}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void choose(file);
          }}
          className={`flex items-center gap-4 rounded-2xl border p-4 transition ${
            dragging ? "border-fuchsia-400 bg-fuchsia-500/10" : "border-white/10 bg-white/5"
          }`}
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-fuchsia-500 to-rose-500 disabled:opacity-60"
            title="Choose a logo"
          >
            {stage === "reading" ? (
              <span className="text-xs font-semibold">Reading…</span>
            ) : currentLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentLogo}
                alt="Ministry logo"
                className="h-full w-full bg-black/20 object-contain"
              />
            ) : (
              <span className="text-2xl font-black">✝</span>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="w-full rounded-full bg-white/15 py-2 text-xs font-semibold hover:bg-white/25 disabled:opacity-50"
            >
              {brand.hasLogo || prepared ? "Choose a different logo" : "Choose logo"}
            </button>
            {prepared && (
              <p className="mt-2 truncate text-[11px] text-emerald-300">
                ✓ Ready to upload
                {prepared.width > 0 ? ` · ${prepared.width}×${prepared.height}` : ""}
                {" · "}
                {(prepared.blob.size / 1024).toFixed(0)}KB
              </p>
            )}
            {!prepared && brand.hasLogo && (
              <button
                type="button"
                onClick={removeLogo}
                disabled={busy}
                className="mt-2 w-full rounded-full bg-white/5 py-2 text-xs font-semibold text-rose-300 hover:bg-white/10 disabled:opacity-50"
              >
                Remove current logo
              </button>
            )}
            <p className="mt-2 text-[10px] text-white/40">
              PNG, JPG, WEBP, GIF or SVG · any size, we resize it for you
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-white/40">
              Ministry name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm outline-none focus:border-fuchsia-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-white/40">
              Tagline
            </span>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={80}
              className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm outline-none focus:border-fuchsia-400"
            />
          </label>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
            Preview
          </p>
          <BrandMark
            brand={{ ...brand, name: name || brand.name, tagline: tagline || brand.tagline }}
            size="md"
            logoOverride={prepared?.previewUrl}
          />
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={busy || stage === "saved"}
          className={`mt-4 w-full rounded-full py-3 text-sm font-bold transition disabled:opacity-60 ${
            stage === "saved"
              ? "bg-emerald-500 text-black"
              : "bg-gradient-to-r from-fuchsia-500 to-rose-500"
          }`}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
