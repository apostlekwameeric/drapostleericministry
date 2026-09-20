import { db } from "@/db";
import { offerings } from "@/db/schema";
import { isAdminRequest, unauthorized } from "@/lib/server/admin";
import { formatMoney } from "@/lib/server/paystack";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const at = new URL(request.url).searchParams.get("at");
  if (!(await isAdminRequest(at))) return unauthorized();
  const rows = await db.select().from(offerings).orderBy(desc(offerings.createdAt)).limit(200);
  const success = rows.filter((r) => r.status === "success");
  const total = success.reduce((sum, r) => sum + r.amount, 0);
  return Response.json({
    ok: true,
    totalMinor: total,
    totalLabel: success[0] ? formatMoney(total, success[0].currency) : formatMoney(0),
    count: success.length,
    offerings: rows.map((r) => ({
      id: r.id,
      name: r.giverName,
      email: r.email,
      amount: r.amount,
      amountLabel: formatMoney(r.amount, r.currency),
      currency: r.currency,
      status: r.status,
      channel: r.channel,
      streamCode: r.streamCode,
      reference: r.reference,
      createdAt: r.createdAt.toISOString(),
      paidAt: r.paidAt ? r.paidAt.toISOString() : null,
    })),
  });
}
