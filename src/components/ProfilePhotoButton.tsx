"use client";

import { prepareImage, uploadImage } from "@/lib/clientImage";
import { useRef, useState } from "react";

type Props = {
  code: string;
  token: string;
  name: string;
  currentUrl?: string | null;
  onUploaded?: (url: string) => void;
  size?: "sm" | "lg";
};

export default function ProfilePhotoButton({
  code,
  token,
  name,
  currentUrl,
  onUploaded,
  size = "lg",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const box = size === "lg" ? "h-20 w-20 text-lg" : "h-9 w-9 text-[10px]";
  const shown = preview ?? currentUrl;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");

  const pick = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const prepared = await prepareImage(file, { maxEdge: 512, preferJpeg: true });
      setPreview(prepared.previewUrl);
      const outcome = await uploadImage<{ ok: boolean; avatar?: string }>(
        `/api/streams/${code}/photo`,
        prepared.blob,
        { token },
        "photo",
      );
      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }
      if (outcome.data.avatar) onUploaded?.(outcome.data.avatar);
    } catch {
      setError("Could not read that photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void pick(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="Add a profile photo"
        className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 via-fuchsia-500 to-rose-500 font-black disabled:opacity-60 ${box}`}
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          initials || "📷"
        )}
        <span className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-[8px] font-bold uppercase tracking-wider">
          {busy ? "…" : "photo"}
        </span>
      </button>
      {size === "lg" && (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 disabled:opacity-50"
          >
            {busy ? "Uploading…" : shown ? "Change photo" : "Add profile photo"}
          </button>
          {error && <p className="mt-1 text-[11px] text-rose-300">{error}</p>}
        </div>
      )}
    </div>
  );
}
