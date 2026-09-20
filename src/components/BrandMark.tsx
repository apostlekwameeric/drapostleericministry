"use client";

import { brandLogoSrc, type BrandInfo } from "@/lib/useBrand";

type Props = {
  brand: BrandInfo;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  /** Preview an image that has not been saved yet. */
  logoOverride?: string | null;
};

const BOX: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-8 w-8 text-sm",
  md: "h-11 w-11 text-lg",
  lg: "h-16 w-16 text-2xl",
};

const NAME: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
};

function monogram(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function BrandMark({
  brand,
  size = "md",
  showText = true,
  className = "",
  logoOverride,
}: Props) {
  const logo = logoOverride ?? brandLogoSrc(brand);

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <div
        className={`grid shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-400 via-fuchsia-500 to-rose-500 font-black text-white ${BOX[size]}`}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt={brand.name}
            className="h-full w-full bg-black/20 object-contain"
            onError={(e) => {
              const el = e.currentTarget;
              if (!el.dataset.fallback) {
                el.dataset.fallback = "1";
                el.src = "/api/brand/logo?fallback=1";
              } else {
                el.style.display = "none";
              }
            }}
          />
        ) : (
          monogram(brand.name) || "✝"
        )}
      </div>
      {showText && (
        <div className="min-w-0 leading-tight">
          <p className={`truncate font-black tracking-tight ${NAME[size]}`}>
            {brand.name}
          </p>
          <p className="truncate text-[10px] uppercase tracking-[0.18em] text-white/50">
            {brand.tagline}
          </p>
        </div>
      )}
    </div>
  );
}
