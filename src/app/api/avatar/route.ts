import { hashString, mulberry32 } from "@/lib/sim/random";

export const dynamic = "force-dynamic";

const PALETTES: [string, string][] = [
  ["#f43f5e", "#f59e0b"],
  ["#8b5cf6", "#ec4899"],
  ["#06b6d4", "#3b82f6"],
  ["#10b981", "#84cc16"],
  ["#f97316", "#ef4444"],
  ["#a855f7", "#6366f1"],
  ["#14b8a6", "#0ea5e9"],
  ["#eab308", "#f97316"],
  ["#d946ef", "#8b5cf6"],
  ["#22c55e", "#14b8a6"],
  ["#0ea5e9", "#6366f1"],
  ["#fb7185", "#c084fc"],
];

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === '"' ? "&quot;" : "&#39;",
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seed = url.searchParams.get("s") ?? "anon";
  const initials = (url.searchParams.get("n") ?? "?").replace(/\s+/g, "").slice(0, 2).toUpperCase() || "?";
  const h = hashString(seed);
  const rand = mulberry32(h);
  const [c1, c2] = PALETTES[h % PALETTES.length];
  const angle = Math.floor(rand() * 360);
  const accentKind = Math.floor(rand() * 4);
  const accentX = 20 + Math.floor(rand() * 56);
  const accentY = 20 + Math.floor(rand() * 56);

  let accent = "";
  if (accentKind === 1) {
    accent = `<circle cx="${accentX}" cy="${accentY}" r="34" fill="#ffffff" opacity="0.14"/>`;
  } else if (accentKind === 2) {
    accent = `<rect x="-20" y="${accentY}" width="140" height="22" transform="rotate(-25 48 48)" fill="#000000" opacity="0.12"/>`;
  } else if (accentKind === 3) {
    accent = `<circle cx="${accentX}" cy="${accentY}" r="14" fill="#ffffff" opacity="0.22"/><circle cx="${96 - accentX}" cy="${96 - accentY}" r="24" fill="#000000" opacity="0.1"/>`;
  }

  const fontSize = initials.length > 1 ? 34 : 40;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient><clipPath id="c"><circle cx="48" cy="48" r="48"/></clipPath></defs><g clip-path="url(#c)"><rect width="96" height="96" fill="url(#g)"/>${accent}</g><text x="48" y="49" dy=".35em" text-anchor="middle" font-family="Inter, 'Segoe UI', Roboto, Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff" opacity="0.96">${escapeXml(initials)}</text></svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
