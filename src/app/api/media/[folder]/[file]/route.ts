import { readPublicFile } from "@/lib/server/staticFile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ folder: string; file: string }> },
) {
  const { folder, file } = await params;
  if (!folder || !file || folder.includes("..") || file.includes("..")) {
    return new Response("Not found", { status: 404 });
  }
  const fileData = await readPublicFile(`${folder}/${file}`);
  if (!fileData) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(fileData.data), {
    headers: {
      "Content-Type": fileData.mime,
      "Content-Length": String(fileData.data.byteLength),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
