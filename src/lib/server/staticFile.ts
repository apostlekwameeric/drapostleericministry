import { embeddedFile } from "@/lib/server/embeddedImages";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function readPublicFile(relPath: string) {
  const safe = normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const bundled = embeddedFile(safe);
  if (bundled) return bundled;
  const candidates = [
    join(process.cwd(), "public", safe),
    join(process.cwd(), "src", "assets", safe),
    ...(safe === "brand/logo.png" || safe === "brand/act-of-faith-logo.png"
      ? [join(process.cwd(), "src", "assets", "chapel-logo.png")]
      : []),
  ];
  for (const file of candidates) {
    try {
      const data = await readFile(file);
      const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
      return { data, mime: MIME[ext] ?? "application/octet-stream" };
    } catch {
      /* try next */
    }
  }
  return null;
}
