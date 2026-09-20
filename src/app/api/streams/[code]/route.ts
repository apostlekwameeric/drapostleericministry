import { activeParticipants, findStream, summarize } from "@/lib/server/room";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const stream = await findStream(code);
  if (!stream) {
    return Response.json({ error: "Stream not found" }, { status: 404 });
  }
  const people = await activeParticipants(stream.id);
  return Response.json({ stream: summarize(stream, people) });
}
