import { db } from "@/db";
import { offerings } from "@/db/schema";
import { findStream } from "@/lib/server/room";
import { initializePaystack, paystackCurrency } from "@/lib/server/paystack";
import { originFromRequest } from "@/lib/server/origin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim().toLowerCase() : "";
    const major = Number(body.amount);
    if (!name) return Response.json({ ok: false, error: "Please enter your name." }, { status: 400 });
    if (!email.includes("@")) {
      return Response.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
    }
    if (!Number.isFinite(major) || major < 1) {
      return Response.json({ ok: false, error: "Enter an amount of at least 1." }, { status: 400 });
    }
    const currency = paystackCurrency();
    const amountMinor = Math.round(major * 100);
    const stream = code ? await findStream(code) : null;
    const origin = originFromRequest(request);
    const callbackUrl = `${origin}/api/offerings/callback?code=${encodeURIComponent(code)}`;
    const started = await initializePaystack({
      email,
      amountMinor,
      currency,
      name,
      streamCode: code || null,
      callbackUrl,
    });
    await db.insert(offerings).values({
      streamId: stream?.id ?? null,
      streamCode: code || null,
      giverName: name,
      email,
      amount: amountMinor,
      currency,
      reference: started.reference,
      status: "pending",
    });
    return Response.json({
      ok: true,
      authorizationUrl: started.authorizationUrl,
      reference: started.reference,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start payment.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
