import { db } from "@/db";
import { brand } from "@/db/schema";
import { BRAND_ROW_ID, DEFAULT_BRAND } from "@/lib/server/brand";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "akm_admin";
const DEFAULT_PIN = "7772";
/** PIN unlock stays valid for a long time — do not bounce back to the keypad. */
const SESSION_HOURS = 24 * 365 * 10;

function sessionSecret() {
  // Must stay stable across deploys. Never HMAC with DATABASE_URL (it can change).
  return process.env.ADMIN_SESSION_SECRET ?? "act-of-faith-chapel-admin-session-v1";
}

function hashPin(pin: string, salt: string) {
  return scryptSync(pin, salt, 32).toString("hex");
}

async function storedPin() {
  try {
    const rows = await db
      .select({ hash: brand.adminPinHash, salt: brand.adminPinSalt })
      .from(brand)
      .where(eq(brand.id, BRAND_ROW_ID))
      .limit(1);
    const row = rows[0];
    if (row?.hash && row.salt) return { hash: row.hash, salt: row.salt };
  } catch {
    /* fall back to the default PIN if the table is not ready */
  }
  return null;
}

export async function verifyPin(pin: string) {
  const clean = pin.replace(/\D/g, "");
  if (clean.length < 4) return false;
  const stored = await storedPin();
  if (!stored) return clean === DEFAULT_PIN;
  const candidate = Buffer.from(hashPin(clean, stored.salt), "hex");
  const expected = Buffer.from(stored.hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function setPin(pin: string) {
  const clean = pin.replace(/\D/g, "");
  if (clean.length < 4 || clean.length > 8) {
    throw new Error("PIN must be 4 to 8 digits");
  }
  const salt = randomBytes(16).toString("hex");
  const hash = hashPin(clean, salt);
  await db
    .insert(brand)
    .values({
      id: BRAND_ROW_ID,
      name: DEFAULT_BRAND.name,
      tagline: DEFAULT_BRAND.tagline,
      adminPinHash: hash,
      adminPinSalt: salt,
      adminPinUpdatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: brand.id,
      set: { adminPinHash: hash, adminPinSalt: salt, adminPinUpdatedAt: new Date() },
    });
}

export async function isDefaultPin() {
  return (await storedPin()) === null;
}

/* ------------------------------------------------------------- sessions */

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function makeSessionToken() {
  const expires = Date.now() + SESSION_HOURS * 3600 * 1000;
  const payload = `${expires}.${randomBytes(8).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}

export function validateSessionToken(token: string | undefined | null) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expires, nonce, signature] = parts;
  const payload = `${expires}.${nonce}`;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(expires) > Date.now();
}

/**
 * Admin requests carry a bearer token (works inside iframes / embedded previews
 * where third-party cookies are blocked). The cookie is a convenience fallback.
 */
export function tokenFromHeaders(h: Headers) {
  const auth = h.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const custom = h.get("x-admin-token");
  if (custom) return custom.trim();
  return null;
}

export async function isAdminRequest(extraToken?: string | null) {
  if (extraToken && validateSessionToken(extraToken)) return true;
  try {
    const h = await headers();
    const bearer = tokenFromHeaders(h);
    if (bearer && validateSessionToken(bearer)) return true;
    const fromQuery = h.get("x-url-admin-token");
    if (fromQuery && validateSessionToken(fromQuery)) return true;
  } catch {
    /* headers() unavailable — fall through to cookie */
  }
  try {
    const jar = await cookies();
    if (validateSessionToken(jar.get(ADMIN_COOKIE)?.value)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function requestIsSecure(request: Request) {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  return new URL(request.url).protocol === "https:";
}

export function sessionCookieOptions(secure: boolean, maxAgeSeconds = SESSION_HOURS * 3600) {
  return {
    httpOnly: true,
    // SameSite=None is required for embedded (iframe) use and needs Secure.
    sameSite: secure ? ("none" as const) : ("lax" as const),
    secure,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function unauthorized() {
  return Response.json({ ok: false, error: "Admin login required" }, { status: 401 });
}
