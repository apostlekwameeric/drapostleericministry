import { readPublicFile } from "@/lib/server/staticFile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const rel = new URL(request.url).searchParams.get("p") ?? "";
  if (!rel || rel.includes("..") || rel.startsWith("/") || rel.includes("\\")) {
    return new Response("Not found", { status: 404 });
  }
  const file = await readPublicFile(rel);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.data.byteLength),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
