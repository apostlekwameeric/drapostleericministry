import {
  ADMIN_COOKIE,
  isAdminRequest,
  isDefaultPin,
  makeSessionToken,
  requestIsSecure,
  sessionCookieOptions,
  verifyPin,
} from "@/lib/server/admin";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Simple in-memory throttle: 5 wrong attempts → 30s cool-down per IP.
const attempts = new Map<string, { count: number; until: number }>();

function clientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local"
  );
}

export async function GET(request: Request) {
  const at = new URL(request.url).searchParams.get("at");
  const ok = await isAdminRequest(at);
  return Response.json({ ok, authenticated: ok, defaultPin: ok ? await isDefaultPin() : undefined });
}

export async function POST(request: Request) {
  const key = clientKey(request);
  const now = Date.now();
  const record = attempts.get(key);
  if (record && record.until > now) {
    const wait = Math.ceil((record.until - now) / 1000);
    return Response.json(
      { ok: false, error: `Too many attempts. Try again in ${wait}s.` },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { pin?: unknown };
  const pin = typeof body.pin === "string" ? body.pin : "";
  const valid = await verifyPin(pin);

  if (!valid) {
    const count = (record && record.until > now - 120_000 ? record.count : 0) + 1;
    attempts.set(key, { count, until: count >= 5 ? now + 30_000 : now });
    return Response.json({ ok: false, error: "Wrong PIN" }, { status: 401 });
  }

  attempts.delete(key);
  const token = makeSessionToken();
  try {
    const jar = await cookies();
    jar.set(ADMIN_COOKIE, token, sessionCookieOptions(requestIsSecure(request)));
  } catch {
    /* cookie is optional — the client keeps the bearer token */
  }
  return Response.json({ ok: true, token, defaultPin: await isDefaultPin() });
}

export async function DELETE(request: Request) {
  try {
    const jar = await cookies();
    jar.set(ADMIN_COOKIE, "", sessionCookieOptions(requestIsSecure(request), 0));
  } catch {
    /* noop */
  }
  return Response.json({ ok: true });
}
