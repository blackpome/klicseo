"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, AlertCircle, Phone, BellRing, ThumbsUp, PenLine } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { savePaymentAction } from "./actions";
import { PAYMENT_METHODS, type PaymentRow as PaymentData } from "@/lib/payments-shared";
import { inr } from "@/lib/pricing";
import { fillTemplate } from "@/lib/site-settings-shared";
import { useSiteSettings } from "@/components/SiteSettingsContext";

export interface PaymentCustomer {
  id: string;
  name: string | null;
  phone: string | null;
  service_option: string | null;
  price_total: number | null;
}

const todayISO = () => new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);

// --- WhatsApp + tel helpers ----------------------------------------------

/** Phone digits in international format (Indian default if 10 digits). */
function intlDigits(phone: string | null | undefined): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function waLink(phone: string | null | undefined, text?: string): string {
  const d = intlDigits(phone);
  if (!d) return "#";
  const t = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${d}${t}`;
}

function telLink(phone: string | null | undefined): string {
  const raw = String(phone ?? "").replace(/\s+/g, "");
  return raw ? `tel:${raw}` : "#";
}

// Reminder, thanks, and the plain-WA-icon greeting are now admin-editable
// templates (see MessageTemplatesEditor). fillTemplate handles placeholders.

// --- Row ------------------------------------------------------------------

export default function PaymentRow({
  period,
  periodLabel,
  customer,
  payment,
  dueCount,
  dueUnit,
}: {
  period: string;
  periodLabel: string;
  customer: PaymentCustomer;
  payment?: PaymentData | null;
  /** Months unpaid up to and including this period (0 for non-recurring). */
  dueCount: number;
  /** Per-month due amount (the customer's price_total). */
  dueUnit: number;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(savePaymentAction, {} as { error?: string; ok?: string });
  const [paid, setPaid] = useState(payment?.status === "paid");
  const [date, setDate] = useState(payment?.paid_at ?? "");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeText, setComposeText] = useState("");

  const dueAmount = customer.price_total;
  const paidAmount = payment?.amount ?? null;
  const defaultAmount = paidAmount ?? dueAmount ?? "";

  // After a successful save, ask the router to refetch the server data so the
  // page numbers (totals, paid/pending counts) reflect the new state without
  // a manual refresh.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  function toggle() {
    setPaid((v) => {
      const next = !v;
      if (next && !date) setDate(todayISO());
      return next;
    });
  }

  const phone = customer.phone;
  const { messageTemplates } = useSiteSettings();
  // When the customer is multiple months behind, the reminder amount should
  // reflect the total owed, not just one month's price.
  const reminderAmount = dueCount > 1 && dueUnit > 0 ? dueCount * dueUnit : dueAmount;
  const remindHref = waLink(
    phone,
    fillTemplate(messageTemplates.paymentReminder, {
      name: customer.name, service: customer.service_option, amount: reminderAmount, month: periodLabel,
    }),
  );
  const thanksHref = waLink(
    phone,
    fillTemplate(messageTemplates.paymentThanks, {
      name: customer.name, service: customer.service_option, amount: paidAmount ?? dueAmount, month: periodLabel,
    }),
  );
  // Plain WhatsApp icon opens a bare chat — for templated/custom messages
  // the admin uses the reminder, thanks, or compose buttons instead.
  const manualHref = waLink(phone);

  const iconBtn = "grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-white/55 hover:bg-white/10 hover:text-white transition-colors";

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
        <div className="min-w-[160px] flex-1">
          <Link href={`/admin/${customer.id}`} className="text-sm font-medium hover:text-[#C9A84C]">
            {customer.name || "(unnamed)"}
          </Link>
          <div className="text-[11px] text-white/35 flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span>{phone ?? "—"}</span>
            {customer.service_option && (
              <>
                <span className="text-white/25">·</span>
                <span>{customer.service_option}</span>
              </>
            )}
            <span className="text-white/25">·</span>
            <span>{periodLabel}</span>
            {dueCount > 0 && dueUnit > 0 && (
              <>
                <span className="text-white/25">·</span>
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25 px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                  title={`${dueCount} month${dueCount === 1 ? "" : "s"} unpaid — total ${inr(dueCount * dueUnit)}`}
                >
                  {dueCount} × {inr(dueUnit)}
                  <span className="text-amber-300/70 font-semibold">= {inr(dueCount * dueUnit)}</span>
                </span>
              </>
            )}
            {dueCount === 0 && !paid && dueAmount != null && (
              <>
                <span className="text-white/25">·</span>
                <span className="text-amber-300 font-semibold">Due {inr(dueAmount)}</span>
              </>
            )}
          </div>

          {/* Contact actions */}
          {phone && (
            <div className="flex items-center gap-1 mt-1.5">
              <a href={telLink(phone)} title="Call" className={iconBtn} aria-label="Call customer">
                <Phone size={12} />
              </a>
              <a href={manualHref} target="_blank" rel="noopener noreferrer" title="Open WhatsApp chat" className={iconBtn} aria-label="Open WhatsApp chat">
                <FaWhatsapp size={12} className="text-[#25D366]" />
              </a>
              {!paid && (
                <a href={remindHref} target="_blank" rel="noopener noreferrer" title="Send payment reminder via WhatsApp" className={iconBtn} aria-label="Send WhatsApp reminder">
                  <BellRing size={12} className="text-amber-300" />
                </a>
              )}
              {paid && (
                <a href={thanksHref} target="_blank" rel="noopener noreferrer" title="Send thanks via WhatsApp" className={iconBtn} aria-label="Send WhatsApp thanks">
                  <ThumbsUp size={12} className="text-emerald-300" />
                </a>
              )}
              {/* Compose a one-off custom message in the admin UI, then send via WhatsApp. */}
              <button
                type="button"
                onClick={() => setComposeOpen((v) => !v)}
                title="Compose a custom WhatsApp message"
                aria-label="Compose custom WhatsApp message"
                aria-expanded={composeOpen}
                className={iconBtn}
              >
                <PenLine size={12} className="text-[#C9A84C]" />
              </button>
            </div>
          )}

          {/* Inline composer for a one-off WhatsApp message. */}
          {composeOpen && phone && (
            <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-wider text-white/45">Custom message</p>
                <button
                  type="button"
                  onClick={() => {
                    const tpl = paid ? messageTemplates.paymentThanks : messageTemplates.paymentReminder;
                    setComposeText(fillTemplate(tpl, {
                      name: customer.name,
                      service: customer.service_option,
                      amount: paid ? (paidAmount ?? dueAmount) : reminderAmount,
                      month: periodLabel,
                    }));
                  }}
                  className="text-[10px] text-[#C9A84C] hover:underline"
                >
                  Insert {paid ? "thanks" : "reminder"} template
                </button>
              </div>
              <textarea
                value={composeText}
                onChange={(e) => setComposeText(e.target.value)}
                rows={3}
                placeholder="Type a one-off message…"
                className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C] resize-y"
              />
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => { setComposeText(""); setComposeOpen(false); }}
                  className="text-[10px] text-white/45 hover:text-white"
                >
                  Cancel
                </button>
                <a
                  href={composeText.trim() ? waLink(phone, composeText) : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { if (!composeText.trim()) e.preventDefault(); }}
                  aria-disabled={!composeText.trim()}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-[#050E21] ${composeText.trim() ? "" : "opacity-50 cursor-not-allowed"}`}
                  style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
                >
                  <FaWhatsapp size={11} /> Send via WhatsApp
                </a>
              </div>
            </div>
          )}
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
