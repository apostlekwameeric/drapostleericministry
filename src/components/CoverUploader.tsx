"use client";

import { prepareImage, uploadImage } from "@/lib/clientImage";
import { useCallback, useRef, useState } from "react";

type Props = {
  code: string;
  token: string;
  hasCover: boolean;
  onUploaded: () => void;
  compact?: boolean;
};

const MAX_EDGE = 1600;

export default function CoverUploader({
  code,
  token,
  hasCover,
  onUploaded,
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const prepared = await prepareImage(file, {
          maxEdge: MAX_EDGE,
          preferJpeg: true,
          keepGif: true,
        });
        if (!prepared.mime.startsWith("image/")) {
          URL.revokeObjectURL(prepared.previewUrl);
          setError("That does not look like an image. Please choose a JPG or PNG.");
          return;
        }
        const outcome = await uploadImage<{ ok: boolean; coverVersion: number }>(
          `/api/streams/${code}/cover`,
          prepared.blob,
          { token, width: String(prepared.width), height: String(prepared.height) },
          "banner",
        );
        URL.revokeObjectURL(prepared.previewUrl);
        if (!outcome.ok) {
          setError(outcome.error);
          return;
        }
        onUploaded();
      } catch {
        setError("Could not read that file. Please pick it again.");
      } finally {
        setBusy(false);
      }
    },
    [code, onUploaded, token],
  );

  const removeCover = useCallback(async () => {
    setBusy(true);
    try {
      await fetch(`/api/streams/${code}/cover`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      onUploaded();
    } finally {
      setBusy(false);
    }
  }, [code, onUploaded, token]);

  const applySample = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/samples/demo-banner.jpg");
      const blob = await res.blob();
      await upload(new File([blob], "sample.jpg", { type: "image/jpeg" }));
    } catch {
      setError("Could not load the sample banner.");
    } finally {
      setBusy(false);
    }
  }, [upload]);

  const pick = () => inputRef.current?.click();

  return (
    <div className={compact ? "" : "w-full"}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />

      {compact ? (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={pick}
            disabled={busy}
            className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold hover:bg-white/25 disabled:opacity-50"
          >
            {busy ? "Uploading…" : hasCover ? "🖼️ Change banner" : "🖼️ Upload banner"}
          </button>
          {hasCover && (
            <button
              onClick={removeCover}
              disabled={busy}
              className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-rose-300 disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      ) : (
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
            if (file) void upload(file);
          }}
          onClick={pick}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
            dragging
              ? "border-fuchsia-400 bg-fuchsia-500/10"
              : "border-white/20 bg-white/5 hover:border-fuchsia-400/60"
          }`}
        >
          <span className="text-3xl">🖼️</span>
          <p className="text-sm font-semibold">
            {busy
              ? "Uploading…"
              : hasCover
                ? "Replace program banner"
                : "Upload your program banner"}
          </p>
          <p className="text-xs text-white/50">
            Drag an image here or tap to browse · any JPG, PNG, WEBP or GIF
          </p>
          {!hasCover && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                void applySample();
              }}
              disabled={busy}
              className="mt-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-fuchsia-200 hover:bg-white/20 disabled:opacity-50"
            >
              ✨ Use a sample banner
            </button>
          )}
          {hasCover && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                void removeCover();
              }}
              disabled={busy}
              className="mt-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-rose-300"
            >
              Remove banner
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    </div>
  );
}
