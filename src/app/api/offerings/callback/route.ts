import { verifyAndRecord } from "@/lib/server/paystack";
import { originFromRequest } from "@/lib/server/origin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const origin = originFromRequest(request);
  const back = code ? `${origin}/live/${code}` : origin;
  if (!reference) {
    return Response.redirect(`${back}?offering=missing`);
  }
  try {
    const row = await verifyAndRecord(reference);
    const ok = row?.status === "success";
    return Response.redirect(`${back}?offering=${ok ? "success" : "pending"}`);
  } catch {
    return Response.redirect(`${back}?offering=error`);
  }
}
