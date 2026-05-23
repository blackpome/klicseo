"use client";

import { useMemo, useState } from "react";
import PaymentRow, { type PaymentCustomer } from "./PaymentRow";
import type { PaymentRow as PaymentData } from "@/lib/payments-shared";
import { inr } from "@/lib/pricing";

export interface PaymentItem {
  customer: PaymentCustomer;
  payment: PaymentData | null;
}

type Filter = "all" | "paid" | "pending";

export default function PaymentsTable({ period, items }: { period: string; items: PaymentItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const totals = useMemo(() => {
    let paidCount = 0;
    let paidSum = 0;
    for (const it of items) {
      if (it.payment?.status === "paid") {
        paidCount++;
        paidSum += it.payment.amount ?? 0;
      }
    }
    return { paidCount, paidSum, pendingCount: items.length - paidCount };
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      const status = it.payment?.status ?? "pending";
      if (filter !== "all" && status !== filter) return false;
      if (needle) {
        const hay = `${it.customer.name ?? ""} ${it.customer.phone ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [items, filter, q]);

  const pill = (id: Filter, label: string, count: number) => {
    const active = filter === id;
    return (
      <button
        type="button"
        onClick={() => setFilter(id)}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
          active ? "bg-[#C9A84C] text-[#050E21]" : "bg-white/5 text-white/60 hover:bg-white/10"
        }`}
      >
        {label} <span className={active ? "text-[#050E21]/60" : "text-white/35"}>{count}</span>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {/* Totals */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300">Collected · {inr(totals.paidSum)}</span>
        <span className="px-3 py-1.5 rounded-full bg-white/5 text-white/55">{items.length} customers</span>
      </div>

      {/* Filter + search */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-2">
          {pill("all", "All", items.length)}
          {pill("paid", "Paid", totals.paidCount)}
          {pill("pending", "Pending", totals.pendingCount)}
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or phone…"
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] w-full sm:w-56"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-white/40 text-sm">
          {items.length === 0 ? "No booked customers yet." : "No customers match this filter."}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((it) => (
            <PaymentRow key={it.customer.id} period={period} customer={it.customer} payment={it.payment} />
          ))}
        </div>
      )}
    </div>
  );
}
