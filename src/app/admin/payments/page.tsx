import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet, ChevronLeft, ChevronRight } from "lucide-react";
import AdminShell from "../AdminShell";
import AdminError from "../AdminError";
import { currentAdmin } from "@/lib/admin-auth";
import { listLeads } from "@/lib/leads";
import { listPeriodPayments, currentPeriod, isValidPeriod } from "@/lib/payments";
import PaymentsTable, { type PaymentItem } from "./PaymentsTable";

function monthLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

function shiftMonth(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  if (!me.permissions.includes("leads.view")) {
    return (
      <AdminShell>
        <div className="mx-auto max-w-md text-center py-24">
          <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-playfair)" }}>No access</h1>
          <p className="text-white/45 text-sm">You don’t have permission to view payments.</p>
        </div>
      </AdminShell>
    );
  }

  const { month } = await searchParams;
  const period = month && isValidPeriod(month) ? month : currentPeriod();

  let customers, payments;
  try {
    [customers, payments] = await Promise.all([
      listLeads({ status: "booked", limit: 500 }),
      listPeriodPayments(period),
    ]);
  } catch (err) {
    return (
      <AdminShell><AdminError err={err} /></AdminShell>
    );
  }

  const payByLead = new Map(payments.map((p) => [p.lead_id, p]));
  const items: PaymentItem[] = customers.map((c) => ({
    customer: { id: c.id, name: c.name, phone: c.phone, service_option: c.service_option, price_total: c.price_total },
    payment: payByLead.get(c.id) ?? null,
  }));

  const navBtn = "grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10";

  return (
    <AdminShell>
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/25">
            <Wallet className="text-[#C9A84C]" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>Payments</h1>
            <p className="text-white/45 text-sm">Track monthly payments for booked customers.</p>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/admin/payments?month=${shiftMonth(period, -1)}`} aria-label="Previous month" className={navBtn}><ChevronLeft size={16} /></Link>
          <span className="text-sm font-semibold min-w-[150px] text-center">{monthLabel(period)}</span>
          <Link href={`/admin/payments?month=${shiftMonth(period, 1)}`} aria-label="Next month" className={navBtn}><ChevronRight size={16} /></Link>
          {period !== currentPeriod() && (
            <Link href="/admin/payments" className="text-xs px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15">This month</Link>
          )}
          <form className="ml-auto flex items-center gap-2">
            <input type="month" name="month" defaultValue={period} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
            <button className="text-xs px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15">Go</button>
          </form>
        </div>

        <PaymentsTable period={period} items={items} />
      </div>
    </AdminShell>
  );
}
