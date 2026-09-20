import { db } from "@/db";
import { offerings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHmac, randomBytes } from "node:crypto";

export function paystackSecret() {
  return process.env.PAYSTACK_SECRET_KEY ?? "";
}

export function paystackCurrency() {
  const raw = (process.env.PAYSTACK_CURRENCY ?? "GHS").toUpperCase();
  return raw === "NGN" || raw === "USD" || raw === "ZAR" || raw === "KES" ? raw : "GHS";
}

export function formatMoney(amountMinor: number, currency = paystackCurrency()) {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(major);
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
}

export async function initializePaystack(input: {
  email: string;
  amountMinor: number;
  currency: string;
  name: string;
  streamCode?: string | null;
  callbackUrl: string;
}) {
  const secret = paystackSecret();
  if (!secret) {
    throw new Error(
      "Paystack is not configured. Add PAYSTACK_SECRET_KEY in Vercel Environment Variables.",
    );
  }
  const reference = `SEED-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`.toUpperCase();
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountMinor,
      currency: input.currency,
      reference,
      callback_url: input.callbackUrl,
      metadata: {
        giver_name: input.name,
        stream_code: input.streamCode ?? "",
        purpose: "seed_offering",
      },
    }),
  });
  const data = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; access_code?: string; reference?: string };
  };
  if (!data.status || !data.data?.authorization_url) {
    throw new Error(data.message || "Paystack could not start this payment.");
  }
  return {
    authorizationUrl: data.data.authorization_url,
    reference: data.data.reference ?? reference,
    accessCode: data.data.access_code,
  };
}

export async function verifyAndRecord(reference: string) {
  const secret = paystackSecret();
  if (!secret) throw new Error("Paystack is not configured.");
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const data = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: {
      id?: number;
      status?: string;
      amount?: number;
      currency?: string;
      channel?: string;
      paid_at?: string;
      customer?: { email?: string };
      metadata?: { giver_name?: string; stream_code?: string };
    };
  };
  if (!data.status || !data.data) {
    throw new Error(data.message || "Could not verify payment.");
  }
  const paid = data.data.status === "success";
  const rows = await db.select().from(offerings).where(eq(offerings.reference, reference)).limit(1);
  const existing = rows[0];
  if (existing) {
    if (paid && existing.status !== "success") {
      await db
        .update(offerings)
        .set({
          status: "success",
          paystackId: String(data.data.id ?? ""),
          channel: data.data.channel ?? existing.channel,
          paidAt: data.data.paid_at ? new Date(data.data.paid_at) : new Date(),
          amount: data.data.amount ?? existing.amount,
          currency: data.data.currency ?? existing.currency,
        })
        .where(eq(offerings.id, existing.id));
    }
    return { ...existing, status: paid ? "success" : existing.status };
  }
  return null;
}

export function webhookSignatureOk(rawBody: string, signature: string | null) {
  const secret = paystackSecret();
  if (!secret || !signature) return false;
  const hash = createHmac("sha512", secret).update(rawBody).digest("hex");
  return hash === signature;
}
