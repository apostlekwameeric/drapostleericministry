import { db } from "@/db";
import { brand } from "@/db/schema";
import { ensureSchema } from "@/lib/server/ensureSchema";
import { eq } from "drizzle-orm";

export type BrandInfo = {
  name: string;
  tagline: string;
  logoVersion: number;
  hasLogo: boolean;
  homeBannerVersion: number;
  hasHomeBanner: boolean;
};

export const BRAND_ROW_ID = 1;

export const DEFAULT_BRAND: BrandInfo = {
  name: "Act of Faith Chapel International",
  tagline: "Live Streaming",
  logoVersion: 0,
  hasLogo: true,
  homeBannerVersion: 0,
  hasHomeBanner: false,
};

export async function getBrand(): Promise<BrandInfo> {
  if (process.env.NEXT_PHASE === "phase-production-build") return DEFAULT_BRAND;
  try {
    await ensureSchema();
    const rows = await db
      .select({
        name: brand.name,
        tagline: brand.tagline,
        logoVersion: brand.logoVersion,
        homeBannerVersion: brand.homeBannerVersion,
      })
      .from(brand)
      .where(eq(brand.id, BRAND_ROW_ID))
      .limit(1);
    const row = rows[0];
    if (!row) return DEFAULT_BRAND;
    return {
      name: row.name?.trim() || DEFAULT_BRAND.name,
      tagline: row.tagline?.trim() || DEFAULT_BRAND.tagline,
      logoVersion: row.logoVersion,
      hasLogo: true,
      homeBannerVersion: row.homeBannerVersion ?? 0,
      hasHomeBanner: (row.homeBannerVersion ?? 0) > 0,
    };
  } catch {
    // Database may not be migrated yet (e.g. during a cold build).
    return DEFAULT_BRAND;
  }
}
