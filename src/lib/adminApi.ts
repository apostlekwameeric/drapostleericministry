"use client";

import type { PublicMessage, PublicParticipant, StreamSummary } from "@/lib/types";
import type { BrandInfo } from "@/lib/useBrand";

export type DeviceInfo = {
  cameras: { deviceId: string; label: string; facing: "user" | "environment" | "unknown" }[];
  activeCameraId: string | null;
  activeFacing: "user" | "environment" | "unknown";
  torchSupported: boolean;
  torchOn: boolean;
  reportedAt: number;
};

export type AdminRoom = StreamSummary & {
  id: number;
  endedAt: string | null;
  hostOnline: boolean;
  hostDevice: DeviceInfo | null;
  hostMic: boolean | null;
  hostCam: boolean | null;
  hostMedia: "video" | "audio" | "none" | null;
  participants: (PublicParticipant & { muted: boolean })[];
};

export type Overview = {
  ok: boolean;
  brand: BrandInfo;
  defaultPin: boolean;
  rooms: AdminRoom[];
  focusCode: string | null;
  chat: PublicMessage[];
  totals: { streams: number; ended: number };
  serverTime: string;
};

export type ActionResult = { ok: boolean; error?: string } & Record<string, unknown>;

/* ------------------------------------------------------------ token store */

const TOKEN_KEY = "akm:admin:token";
let memoryToken: string | null = null;

export function getAdminToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window === "undefined") return null;
  try {
    memoryToken = window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export function setAdminToken(token: string | null) {
  memoryToken = token;
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked (private mode / partitioned iframe) — memory copy still works */
  }
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

export function adminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAdminToken();
  if (!token) return extra;
  return { ...extra, Authorization: `Bearer ${token}`, "x-admin-token": token };
}

/* ------------------------------------------------------------ session */

export async function checkSession(): Promise<{ authenticated: boolean; defaultPin?: boolean }> {
  try {
    const token = getAdminToken();
    const res = await fetch(`/api/admin/session${token ? `?at=${encodeURIComponent(token)}` : ""}`, {
      cache: "no-store",
      headers: adminHeaders(),
    });
    const data = (await res.json().catch(() => ({}))) as { authenticated?: boolean; defaultPin?: boolean };
    return { authenticated: Boolean(data.authenticated), defaultPin: data.defaultPin };
  } catch {
    return { authenticated: false };
  }
}

export async function loginWithPin(pin: string): Promise<{ ok: boolean; error?: string; defaultPin?: boolean }> {
  try {
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      token?: string;
      defaultPin?: boolean;
    };
    if (!res.ok || !data.ok || !data.token) {
      return { ok: false, error: data.error ?? `Login failed (HTTP ${res.status})` };
    }
    setAdminToken(data.token);
    return { ok: true, defaultPin: data.defaultPin };
  } catch {
    return { ok: false, error: "Network problem. Try again." };
  }
}

export async function logoutAdmin() {
  try {
    await fetch("/api/admin/session", { method: "DELETE", headers: adminHeaders() });
  } catch {
    /* noop */
  }
  setAdminToken(null);
}

/* ------------------------------------------------------------ calls */

export async function adminAction(payload: Record<string, unknown>): Promise<ActionResult> {
  try {
    const res = await fetch("/api/admin/action", {
      method: "POST",
      headers: adminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ ...payload, adminToken: getAdminToken() ?? undefined }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as ActionResult;
    if (res.status === 401) {
      return { ok: false, error: "Could not save. Please try again." };
    }
    return { ...data, ok: res.ok && data.ok !== false };
  } catch {
    return { ok: false, error: "Network problem" };
  }
}

/** `null` = not authorised, `undefined` = transient error (keep the current view). */
export async function fetchOverview(code: string | null, since = 0): Promise<Overview | null | undefined> {
  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (since) params.set("since", String(since));
  const token = getAdminToken();
  if (token) params.set("at", token);
  try {
    const res = await fetch(`/api/admin/overview?${params.toString()}`, {
      cache: "no-store",
      headers: adminHeaders(),
    });
    if (res.status === 401) return null;
    if (!res.ok) return undefined;
    return (await res.json()) as Overview;
  } catch {
    return undefined;
  }
}
