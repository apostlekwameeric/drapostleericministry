"use client";

import { useCallback, useEffect, useState } from "react";

export type BrandInfo = {
  name: string;
  tagline: string;
  logoVersion: number;
  hasLogo: boolean;
  homeBannerVersion: number;
  hasHomeBanner: boolean;
};

export const FALLBACK_BRAND: BrandInfo = {
  name: "Act of Faith Chapel International",
  tagline: "Live Streaming",
  logoVersion: 0,
  hasLogo: true,
  homeBannerVersion: 0,
  hasHomeBanner: false,
};

export function homeBannerSrc(brand: BrandInfo) {
  return `/api/brand/home-banner?v=${brand.homeBannerVersion || 0}`;
}

let cached: BrandInfo | null = null;
const listeners = new Set<(b: BrandInfo) => void>();

export function brandLogoSrc(brand: BrandInfo) {
  return `/api/brand/logo?v=${brand.logoVersion || 1}`;
}

export function publishBrand(next: BrandInfo) {
  cached = next;
  listeners.forEach((fn) => fn(next));
}

export function useBrand(initial?: BrandInfo) {
  const [brand, setBrand] = useState<BrandInfo>(cached ?? initial ?? FALLBACK_BRAND);

  useEffect(() => {
    if (initial && !cached) cached = initial;
    listeners.add(setBrand);
    return () => {
      listeners.delete(setBrand);
    };
  }, [initial]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/brand", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as BrandInfo;
      publishBrand(data);
    } catch {
      /* keep whatever we have */
    }
  }, []);

  useEffect(() => {
    if (initial) return;
    void refresh();
  }, [refresh, initial]);

  return { brand, refresh, logoSrc: brandLogoSrc(brand) };
}
