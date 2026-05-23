"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Check, AlertCircle } from "lucide-react";
import { savePaymentAction } from "./actions";
import { PAYMENT_METHODS, type PaymentRow as PaymentData } from "@/lib/payments-shared";

export interface PaymentCustomer {
  id: string;
  name: string | null;
  phone: string | null;
  service_option: string | null;
  price_total: number | null;
}

const todayISO = () => new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);

export default function PaymentRow({
  period,
  customer,
  payment,
}: {
  period: string;
  customer: PaymentCustomer;
  payment?: PaymentData | null;
}) {
  const [state, action, pending] = useActionState(savePaymentAction, {} as { error?: string; ok?: string });
  const [paid, setPaid] = useState(payment?.status === "paid");
  const [date, setDate] = useState(payment?.paid_at ?? "");

  const defaultAmount = payment?.amount ?? customer.price_total ?? "";

  function toggle() {
    setPaid((v) => {
      const next = !v;
      if (next && !date) setDate(todayISO()); // auto-stamp today when marking paid
      return next;
    });
  }

  return (
    <form
      action={action}
      className={`rounded-xl border p-3 transition-colors ${
        paid ? "border-emerald-500/30 bg-emerald-500/[0.05]" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <input type="hidden" name="lead_id" value={customer.id} />
      <input type="hidden" name="period" value={period} />
      <input type="hidden" name="status" value={paid ? "paid" : "pending"} />

      <div className="flex items-center gap-3 flex-wrap">
        {/* Customer */}
        <div className="min-w-[140px] flex-1">
          <Link href={`/admin/${customer.id}`} className="text-sm font-medium hover:text-[#C9A84C]">
            {customer.name || "(unnamed)"}
          </Link>
          <div className="text-[11px] text-white/35">
            {customer.phone ?? "—"}{customer.service_option ? ` · ${customer.service_option}` : ""}
          </div>
        </div>

        {/* Paid/Pending toggle */}
        <button
          type="button"
          onClick={toggle}
          aria-pressed={paid}
          className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
            paid ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
          }`}
        >
          {paid ? "● Paid" : "○ Pending"}
        </button>

        {/* Amount */}
        <div className="flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden">
          <span className="pl-2 text-xs text-white/40">₹</span>
          <input type="text" inputMode="numeric" name="amount" defaultValue={defaultAmount} placeholder="—" aria-label="Amount" className="w-20 bg-transparent px-1.5 py-1.5 text-sm focus:outline-none" />
        </div>

        {/* Method */}
        <select name="method" defaultValue={payment?.method ?? ""} aria-label="Payment method" className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]">
          <option value="">Method…</option>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m} className="bg-[#050E21]">{m.toUpperCase()}</option>)}
        </select>

        {/* Paid date */}
        <input type="date" name="paid_at" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Paid date" className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-[#C9A84C]" />

        <button type="submit" disabled={pending} className="text-xs px-3.5 py-1.5 rounded-lg font-semibold bg-[#C9A84C] text-[#050E21] hover:brightness-110 disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <input name="notes" defaultValue={payment?.notes ?? ""} placeholder="Notes (optional)" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]" />
        {state.ok && <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300"><Check size={12} /> {state.ok}</span>}
        {state.error && <span className="inline-flex items-center gap-1 text-[11px] text-red-300"><AlertCircle size={12} /> {state.error}</span>}
      </div>
    </form>
  );
}
