"use client";

import AdsManager from "@/components/admin/AdsManager";
import BrandMark from "@/components/BrandMark";
import BrandSettings from "@/components/BrandSettings";
import { adminAction, adminHeaders, getAdminToken } from "@/lib/adminApi";
import { prepareImage, uploadImage } from "@/lib/clientImage";
import type { BrandInfo } from "@/lib/useBrand";
import { useRef, useState } from "react";

type Props = {
  brand: BrandInfo;
  defaultPin: boolean;
  onBrandSaved: (brand: BrandInfo) => void;
  notify: (text: string, tone?: "ok" | "warn") => void;
  onLogout: () => void;
};

export default function SettingsPanel({ brand, defaultPin, onBrandSaved, notify, onLogout }: Props) {
  const [brandOpen, setBrandOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [nameBusy, setNameBusy] = useState(false);
  const [name, setName] = useState(brand.name);
  const [tagline, setTagline] = useState(brand.tagline);
  const bannerRef = useRef<HTMLInputElement | null>(null);

  const saveName = async () => {
    setNameBusy(true);
    try {
      const outcome = await uploadImage<{ ok: boolean; brand?: BrandInfo }>(
        "/api/brand",
        null,
        {
          name: name.trim() || "Act of Faith Chapel International",
          tagline: tagline.trim() || "Live Streaming",
          adminToken: getAdminToken() ?? "",
        },
        "logo",
        adminHeaders(),
      );
      if (!outcome.ok) {
        notify(outcome.error, "warn");
        return;
      }
      if (outcome.data.brand) onBrandSaved(outcome.data.brand);
      notify("Ministry name saved");
    } catch {
      notify("Could not save the name", "warn");
    } finally {
      setNameBusy(false);
    }
  };

  const changePin = async () => {
    if (newPin.length < 4 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
      notify("New PIN must be 4–8 digits", "warn");
      return;
    }
    if (newPin !== confirmPin) {
      notify("The two new PINs do not match", "warn");
      return;
    }
    setBusy(true);
    const result = await adminAction({ action: "change-pin", currentPin, newPin });
    setBusy(false);
    if (!result.ok) {
      notify(result.error ?? "Could not change PIN", "warn");
      return;
    }
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    notify("PIN changed — remember the new one!");
  };

  const uploadHomeBanner = async (file: File) => {
    setBannerBusy(true);
    try {
      const prepared = await prepareImage(file, { maxEdge: 1600, preferJpeg: true });
      const outcome = await uploadImage<{ ok: boolean; brand?: BrandInfo }>(
        "/api/brand/home-banner",
        prepared.blob,
        { adminToken: getAdminToken() ?? "" },
        "banner",
        adminHeaders(),
      );
      URL.revokeObjectURL(prepared.previewUrl);
      if (!outcome.ok) {
        notify(outcome.error, "warn");
        return;
      }
      if (outcome.data.brand) onBrandSaved(outcome.data.brand);
      notify("Program banner updated");
    } catch {
      notify("Could not read that image", "warn");
    } finally {
      setBannerBusy(false);
    }
  };

  const removeHomeBanner = async () => {
    setBannerBusy(true);
    try {
      const res = await fetch("/api/brand/home-banner", {
        method: "DELETE",
        headers: adminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ adminToken: getAdminToken() ?? "" }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; brand?: BrandInfo };
      if (!res.ok || data.ok === false) {
        notify(data.error ?? "Could not remove banner", "warn");
        return;
      }
      if (data.brand) onBrandSaved(data.brand);
      notify("Default banner restored");
    } catch {
      notify("Could not remove banner", "warn");
    } finally {
      setBannerBusy(false);
    }
  };

  const input = "w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm tracking-[0.3em] outline-none focus:border-fuchsia-400";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="mb-3 text-sm font-bold">Ministry branding</h3>
        <BrandMark brand={{ ...brand, name: name || brand.name, tagline: tagline || brand.tagline }} size="lg" />
        <p className="mt-3 text-xs text-white/50">
          Default on the public site is Act of Faith Chapel International. Change it here anytime.
        </p>
        <label className="mt-3 block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-white/40">
            Ministry name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Act of Faith Chapel International"
            className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
          />
        </label>
        <label className="mt-2 block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-white/40">
            Tagline
          </span>
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={80}
            placeholder="Live Streaming"
            className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveName()}
            disabled={nameBusy}
            className="rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-5 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {nameBusy ? "Saving…" : "Save name"}
          </button>
          <button
            type="button"
            onClick={() => setBrandOpen(true)}
            className="rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold"
          >
            Edit logo
          </button>
        </div>
        <BrandSettings open={brandOpen} brand={brand} onClose={() => setBrandOpen(false)} onSaved={onBrandSaved} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="mb-1 text-sm font-bold">Homepage program banner</h3>
        <p className="mb-3 text-xs text-white/50">
          Shown on the public site under “Watch the service…”. Upload a wide image (JPG or PNG).
        </p>
        <div className="mb-3 overflow-hidden rounded-xl border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/brand/home-banner?v=${brand.homeBannerVersion || 0}`}
            alt="Program banner preview"
            className="aspect-[16/7] w-full object-cover"
          />
        </div>
        <input
          ref={bannerRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void uploadHomeBanner(file);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={bannerBusy}
            onClick={() => bannerRef.current?.click()}
            className="rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            {bannerBusy ? "Saving…" : "Upload new banner"}
          </button>
          {brand.hasHomeBanner && (
            <button
              type="button"
              disabled={bannerBusy}
              onClick={() => void removeHomeBanner()}
              className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      </section>

      <AdsManager notify={notify} />

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-2">
        <h3 className="mb-1 text-sm font-bold">Admin PIN</h3>
        {defaultPin && (
          <p className="mb-3 rounded-xl bg-amber-500/15 px-3 py-2 text-[11px] text-amber-100">
            You are still using the starting PIN <span className="font-mono font-bold">7772</span>. Change it so only you can open this dashboard.
          </p>
        )}
        <div className="space-y-2">
          <input value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" placeholder="Current PIN" className={input} />
          <input value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" placeholder="New PIN (4–8 digits)" className={input} />
          <input value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" placeholder="Repeat new PIN" className={input} />
          <button onClick={changePin} disabled={busy || !currentPin || !newPin} className="w-full rounded-full bg-white/15 py-2.5 text-sm font-semibold hover:bg-white/25 disabled:opacity-40">
            {busy ? "Saving…" : "Change PIN"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-2">
        <h3 className="mb-2 text-sm font-bold">Session</h3>
        <p className="text-xs text-white/50">You stay signed in on this device for 12 hours. Sign out when you use a shared computer.</p>
        <button onClick={onLogout} className="mt-3 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-rose-300 hover:bg-white/20">
          Sign out of admin
        </button>
      </section>
    </div>
  );
}
