"use client";

import { adminHeaders, getAdminToken } from "@/lib/adminApi";
import { useEffect, useState } from "react";

type Row = {
  id: number;
  name: string;
  email: string;
  amountLabel: string;
  status: string;
  channel: string | null;
  streamCode: string | null;
  reference: string;
  paidAt: string | null;
  createdAt: string;
};

export default function OfferingsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState("—");
  const [count, setCount] = useState(0);

  const load = async () => {
    const token = getAdminToken();
    const res = await fetch(`/api/admin/offerings${token ? `?at=${encodeURIComponent(token)}` : ""}`, {
      headers: adminHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { offerings?: Row[]; totalLabel?: string; count?: number };
    setRows(data.offerings ?? []);
    setTotal(data.totalLabel ?? "—");
    setCount(data.count ?? 0);
  };

  useEffect(() => {
    const t = setInterval(() => void load(), 8000);
    queueMicrotask(() => void load());
    return () => clearInterval(t);
  }, []);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold">Seed / Offerings</h3>
          <p className="text-xs text-white/50">Confirmed Paystack gifts show here automatically.</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-amber-300">{total}</p>
          <p className="text-[11px] text-white/40">{count} successful gift{count === 1 ? "" : "s"}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-xs text-white/40">
          No offerings yet. When someone gives on the live, it will appear here.
        </p>
      ) : (
        <ul className="max-h-[480px] space-y-2 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl bg-black/40 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{r.name}</span>
                <span className={r.status === "success" ? "font-bold text-amber-300" : "text-white/50"}>
                  {r.amountLabel}
                </span>
              </div>
              <p className="text-[11px] text-white/45">
                {r.status === "success" ? "Paid" : r.status} · {r.email}
                {r.channel ? ` · ${r.channel}` : ""}
                {r.streamCode ? ` · room ${r.streamCode}` : ""}
              </p>
              <p className="text-[10px] text-white/30">
                {r.paidAt ? new Date(r.paidAt).toLocaleString() : new Date(r.createdAt).toLocaleString()} · {r.reference}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
