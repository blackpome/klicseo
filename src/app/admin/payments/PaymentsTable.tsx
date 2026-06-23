"use client";

import { useMemo, useState } from "react";
import PaymentRow, { type PaymentCustomer } from "./PaymentRow";
import type { PaymentRow as PaymentData } from "@/lib/payments-shared";
import { inr } from "@/lib/pricing";

export interface PaymentItem {
  customer: PaymentCustomer;
  payment: PaymentData | null;
  /** Count of months between booking-month and the currently-viewed period
   *  where the customer hasn't paid. Always 0 for non-monthly services. */
  dueCount: number;
  /** Per-month amount used for the "{x} × ₹{amount}" chip. */
  dueUnit: number;
}

type Filter = "all" | "paid" | "pending";

export default function PaymentsTable({ period, periodLabel, items, canManage }: { period: string; periodLabel: string; items: PaymentItem[]; canManage: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const totals = useMemo(() => {
    let paidCount = 0;
    let paidSum = 0;
    let advanceSum = 0;
    let totalDue = 0;
    for (const it of items) {
      const isPaid = it.payment?.status === "paid";
      const arrears = it.dueCount > 0 && it.dueUnit > 0 ? it.dueCount * it.dueUnit : 0;
      // What this customer still owes: cumulative arrears for monthlies; for
      // non-monthlies their order price if unpaid, else 0.
      const outstanding = arrears > 0 ? arrears : (isPaid ? 0 : (it.customer.price_total ?? 0));
      totalDue += outstanding;
      // Advance is a field on the payment row regardless of status.
      advanceSum += it.payment?.advance_amount ?? 0;
      if (isPaid) {
        paidCount++;
        paidSum += it.payment?.amount ?? 0;
      }
    }
    const collected = paidSum + advanceSum;
    const pending = Math.max(0, totalDue - advanceSum);
    return { paidCount, paidSum, advanceSum, collected, totalDue, pending, pendingCount: items.length - paidCount };
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
        <span className="px-3 py-1.5 rounded-full bg-white/10 text-white/75">Total · {inr(totals.totalDue)}</span>
        <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300">
          Collected · {inr(totals.collected)}
          {totals.advanceSum > 0 && (
            <span className="ml-1 text-emerald-300/70">(incl. {inr(totals.advanceSum)} advance)</span>
          )}
        </span>
        <span
          className={`px-3 py-1.5 rounded-full ${
            totals.pending === 0
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-amber-500/15 text-amber-300"
          }`}
        >
          Pending · {inr(totals.pending)}
        </span>
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
          {filtered.map((it, i) => (
            <div key={it.customer.id} className="flex items-start gap-2.5">
              <span className="mt-3 w-7 shrink-0 text-right text-[11px] font-semibold tabular-nums text-white/40">
                {i + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <PaymentRow
                  period={period}
                  periodLabel={periodLabel}
                  customer={it.customer}
                  payment={it.payment}
                  dueCount={it.dueCount}
                  dueUnit={it.dueUnit}
                  canManage={canManage}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
