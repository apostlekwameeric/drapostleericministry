import { db } from "@/db";
import { offerings } from "@/db/schema";
import { verifyAndRecord, webhookSignatureOk } from "@/lib/server/paystack";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  if (!webhookSignatureOk(raw, signature)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string; status?: string } };
  try {
    event = JSON.parse(raw) as { event?: string; data?: { reference?: string; status?: string } };
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (event.event === "charge.success" && event.data?.reference) {
    try {
      await verifyAndRecord(event.data.reference);
    } catch {
      await db
        .update(offerings)
        .set({ status: event.data.status === "success" ? "success" : "failed" })
        .where(eq(offerings.reference, event.data.reference));
    }
  }
  return Response.json({ ok: true });
}
