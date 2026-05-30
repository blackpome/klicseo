import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin-auth";
import { listLeads } from "@/lib/leads";
import { listPeriodPayments, listPaymentsForLeads, currentPeriod, isValidPeriod, periodFromIso, periodsBetween } from "@/lib/payments";
import { isServiceOptionId, SERVICE_OPTIONS } from "@/lib/pricing";

// Per-month payment history CSV.
//
//   GET /api/admin/payments-export?month=YYYY-MM
//
// Shape matches the screen: one row per booked customer, with their payment
// state for that month (paid/pending/etc), so an admin can hand the file to
// accounting verbatim.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!me.permissions.includes("leads.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const monthParam = req.nextUrl.searchParams.get("month") ?? "";
  const period = monthParam && isValidPeriod(monthParam) ? monthParam : currentPeriod();

  try {
    const [customers, payments] = await Promise.all([
      listLeads({ status: "booked", limit: 5000 }),
      listPeriodPayments(period),
    ]);
    const payByLead = new Map(payments.map((p) => [p.lead_id, p]));

    // Compute "months unpaid" per customer (booking month → period, minus paid months).
    const paidByLead = new Map<string, Set<string>>();
    try {
      const history = await listPaymentsForLeads(customers.map((c) => c.id));
      for (const p of history) {
        if (p.status !== "paid") continue;
        const set = paidByLead.get(p.lead_id) ?? new Set<string>();
        set.add(p.period);
        paidByLead.set(p.lead_id, set);
      }
    } catch { /* non-fatal */ }

    const isMonthly = (svc: string | null | undefined) =>
      !!svc && isServiceOptionId(svc) && SERVICE_OPTIONS[svc].recurring === "monthly";

    const rows: Array<Record<string, string | number | null>> = customers.map((c) => {
      const p = payByLead.get(c.id);
      const startPeriod = periodFromIso(c.created_at) ?? period;
      const all = periodsBetween(startPeriod, period);
      const paidSet = paidByLead.get(c.id) ?? new Set<string>();
      const dueCount = isMonthly(c.service_option) ? all.filter((m) => !paidSet.has(m)).length : 0;
      const dueUnit = c.price_total ?? 0;
      const dueTotal = dueCount * dueUnit;
      return {
        Customer: c.name ?? "",
        Phone: c.phone ?? "",
        Service: c.service_option ?? "",
        Period: period,
        Status: p?.status ?? "pending",
        Amount: p?.amount ?? c.price_total ?? "",
        Advance: p?.advance_amount ?? 0,
        Method: p?.method ?? "",
        "Paid Date": p?.paid_at ?? "",
        "Months Unpaid": dueCount,
        "Total Due": dueTotal,
        Notes: p?.notes ?? "",
      };
    });

    const csv = toCsv(rows);
    const filename = `payments-${period}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 },
    );
  }
}

// --- CSV helpers ---------------------------------------------------------

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /["\n\r,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "Customer,Phone,Service,Period,Status,Amount,Method,Paid Date,Notes\r\n";
  const headers = Array.from(
    rows.reduce<Set<string>>((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set()),
  );
  const lines = [headers.map(csvCell).join(",")];
  for (const r of rows) lines.push(headers.map((h) => csvCell(r[h])).join(","));
  return lines.join("\r\n");
}
