import { db } from "@/db";
import { participants, streams } from "@/db/schema";
import { isAdminRequest, unauthorized } from "@/lib/server/admin";
import { createLiveRoom } from "@/lib/server/createRoom";
import { databaseConfigured, noDatabaseJson } from "@/lib/server/dbGuard";
import { ensureSchema } from "@/lib/server/ensureSchema";
import { PRESENCE_WINDOW_MS, summarize } from "@/lib/server/room";
import type { StreamSummary } from "@/lib/types";
import { and, desc, eq, gt, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!databaseConfigured()) return Response.json({ streams: [] });
  try {
    await ensureSchema();
  const cutoff = new Date(Date.now() - PRESENCE_WINDOW_MS);
  const rows = await db
    .select()
    .from(streams)
    .where(eq(streams.status, "live"))
    .orderBy(desc(streams.createdAt))
    .limit(40);

  const counts = await db
    .select({
      streamId: participants.streamId,
      role: participants.role,
      total: sql<number>`count(*)::int`,
    })
    .from(participants)
    .where(and(eq(participants.active, true), gt(participants.lastSeenAt, cutoff)))
    .groupBy(participants.streamId, participants.role);

  const byStream = new Map<number, { viewers: number; onStage: number }>();
  for (const row of counts) {
    const entry = byStream.get(row.streamId) ?? { viewers: 0, onStage: 0 };
    const total = Number(row.total ?? 0);
    entry.viewers += total;
    if (row.role === "host" || row.role === "guest") entry.onStage += total;
    byStream.set(row.streamId, entry);
  }

  const live: StreamSummary[] = rows
    .map((r) => ({
      summary: summarize(r, []),
      viewers: byStream.get(r.id)?.viewers ?? 0,
      onStage: byStream.get(r.id)?.onStage ?? 0,
      fresh: Date.now() - r.createdAt.getTime() < 45_000,
    }))
    .filter((r) => r.viewers > 0 || r.fresh)
    .map(({ summary, viewers, onStage }) => ({ ...summary, viewers, onStage }));

  return Response.json({ streams: live });
  } catch {
    return Response.json({ streams: [] });
  }
}

export async function POST(request: Request) {
  if (!databaseConfigured()) return noDatabaseJson();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const passed = typeof body.adminToken === "string" ? body.adminToken : null;
  if (!(await isAdminRequest(passed))) return unauthorized();
  const created = await createLiveRoom(body);
  return Response.json(created);
}

export async function PATCH() {
  // Housekeeping: auto-end lives whose host stopped sending heartbeats.
  await db.execute(sql`
    update streams s
    set status = 'ended', ended_at = now()
    where s.status = 'live'
      and s.created_at < now() - interval '2 minutes'
      and not exists (
        select 1 from participants p
        where p.stream_id = s.id
          and p.role = 'host'
          and p.last_seen_at > now() - interval '2 minutes'
      )
  `);
  return Response.json({ ok: true });
}
