"use client";

import type { Identity } from "@/lib/types";

const key = (code: string) => `golive:identity:${code.toLowerCase()}`;

export function loadIdentity(code: string): Identity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Identity;
    if (!parsed?.token || !parsed?.participantId) return null;
    return { ...parsed, code: code.toLowerCase() };
  } catch {
    return null;
  }
}

export function saveIdentity(identity: Identity) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key(identity.code), JSON.stringify(identity));
}

export function clearIdentity(code: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key(code));
}

export function rememberName(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("golive:name", name);
}

export function recallName(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("golive:name") ?? "";
}
