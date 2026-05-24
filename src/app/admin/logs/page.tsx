import { redirect } from "next/navigation";
import Link from "next/link";
import { ScrollText, Download } from "lucide-react";
import AdminShell from "../AdminShell";
import AdminError from "../AdminError";
import { currentAdmin } from "@/lib/admin-auth";
import { listAuditLogs, pruneOldAuditLogs, humaniseField, AUDIT_ENTITIES, type AuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ENTITY_TABS = ["all", ...AUDIT_ENTITIES] as const;

function todayIso(): string {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

const MONEY_FIELDS = new Set([
  "price_total", "amount", "monthly", "weekly_thrice", "outside_monthly",
  "outside_weekly_thrice", "one_time_manual", "one_time_machine", "interior",
  "car_detailing", "interior_detailing", "salary",
]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function inrFmt(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

/** Format a single value for the diff table, using the field name as a hint
 *  (currency for money columns, locale for dates, Yes/No for booleans). */
function fmtValue(field: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return MONEY_FIELDS.has(field) ? inrFmt(v) : v.toLocaleString("en-IN");
  if (typeof v === "string") {
    if (ISO_TIMESTAMP.test(v)) {
      const d = new Date(v);
      return Number.isFinite(d.getTime())
        ? d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : v;
    }
    if (ISO_DATE.test(v)) {
      const [y, m, day] = v.split("-").map(Number);
      const d = new Date(y, m - 1, day);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }
    return v.length > 240 ? `${v.slice(0, 240)}…` : v;
  }
  // Objects / arrays — compact JSON, truncated.
  const json = JSON.stringify(v);
  return json.length > 240 ? `${json.slice(0, 240)}…` : json;
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; entity?: string; from?: string; to?: string }>;
}) {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  if (me.role !== "super_admin" && me.role !== "admin") {
    return (
      <AdminShell>
        <div className="mx-auto max-w-md text-center py-24">
          <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-playfair)" }}>No access</h1>
          <p className="text-white/45 text-sm">Only admins can view audit logs.</p>
        </div>
      </AdminShell>
    );
  }

  await pruneOldAuditLogs();

  const { q, entity, from, to } = await searchParams;
  let logs: AuditLog[] = [];
  let error: unknown = null;
  try {
    logs = await listAuditLogs({ search: q, entity, from, to });
  } catch (err) {
    error = err;
  }

  // Build URLs that preserve current filters.
  const filterParams = (overrides: Record<string, string | undefined>): string => {
    const p = new URLSearchParams();
    const merged = { q, entity, from, to, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const filterHref = (e: string) => `/admin/logs${filterParams({ entity: e })}`;
  const exportHref = `/api/admin/audit-export${filterParams({})}`;

  return (
    <AdminShell>
      <div className="space-y-5 max-w-5xl">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/25">
            <ScrollText className="text-[#C9A84C]" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>Audit logs</h1>
            <p className="text-white/45 text-sm">Every admin action, newest first — for investigations. Kept for 6 months.</p>
          </div>
          <a
            href={exportHref}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 px-3 py-2 text-xs font-semibold"
            title="Download CSV of the currently-filtered logs"
          >
            <Download size={14} /> Export CSV
          </a>
        </div>

        {/* Filters */}
        <form className="flex gap-2 items-end flex-wrap">
          {entity && <input type="hidden" name="entity" value={entity} />}
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-white/45 block mb-1">Search</span>
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Actor, action, summary, id…"
              className="w-56 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-white/45 block mb-1">From</span>
            <input type="date" name="from" defaultValue={from ?? ""} max={todayIso()} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-white/45 block mb-1">To</span>
            <input type="date" name="to" defaultValue={to ?? ""} max={todayIso()} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
          </label>
          <button className="text-xs px-3 py-2 rounded-lg bg-[#C9A84C] text-[#050E21] font-semibold hover:brightness-110">Apply</button>
          {(q || from || to || entity) && (
            <Link href="/admin/logs" className="text-xs px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10">Clear</Link>
          )}
        </form>

        {/* Entity filter */}
        <div className="flex flex-wrap gap-2">
          {ENTITY_TABS.map((e) => {
            const active = (entity ?? "all") === e;
            return (
              <Link
                key={e}
                href={filterHref(e)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  active ? "bg-[#C9A84C] text-[#050E21]" : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {e}
              </Link>
            );
          })}
        </div>

        {error ? (
          <AdminError err={error} />
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-white/40">No log entries.</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-white/[0.03] text-white/45 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="text-left font-semibold px-3 py-2.5">When</th>
                  <th className="text-left font-semibold px-3 py-2.5">Who</th>
                  <th className="text-left font-semibold px-3 py-2.5">Action</th>
                  <th className="text-left font-semibold px-3 py-2.5">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const diff = (l.metadata?.diff ?? null) as Record<string, { from: unknown; to: unknown }> | null;
                  const hasDiff = !!diff && Object.keys(diff).length > 0;
                  return (
                    <tr key={l.id} className="border-t border-white/5 hover:bg-white/[0.02] align-top">
                      <td className="px-3 py-2 whitespace-nowrap text-white/55 text-xs">
                        {new Date(l.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="text-white/80">{l.actor_email ?? "—"}</div>
                        {l.actor_role && <div className="text-white/35">{l.actor_role}</div>}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#C9A84C]">{l.action}</span>
                      </td>
                      <td className="px-3 py-2 text-white/70">
                        <div>{l.summary ?? "—"}</div>
                        {l.entity_id && <div className="text-[10px] text-white/30 font-mono break-all">{l.entity_id}</div>}
                        {hasDiff && (
                          <details className="mt-1.5 group" open>
                            <summary className="cursor-pointer text-[11px] text-[#C9A84C] hover:text-[#E8CC7A] inline-flex items-center gap-1 select-none">
                              <span className="group-open:rotate-90 transition-transform">▸</span>
                              {Object.keys(diff).length} field{Object.keys(diff).length === 1 ? "" : "s"} changed
                              <span className="text-white/40 font-normal">
                                · {Object.keys(diff).map((f) => humaniseField(f)).join(", ")}
                              </span>
                            </summary>
                            <div className="mt-1.5 rounded-md border border-white/10 bg-black/30 overflow-x-auto">
                              <table className="w-full text-[11px]">
                                <thead className="bg-white/[0.03] text-white/35">
                                  <tr>
                                    <th className="text-left font-semibold px-2 py-1">Field</th>
                                    <th className="text-left font-semibold px-2 py-1">From</th>
                                    <th className="text-left font-semibold px-2 py-1">To</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.entries(diff).map(([field, change]) => (
                                    <tr key={field} className="border-t border-white/5 align-top">
                                      <td className="px-2 py-1 text-white/80 font-medium">{humaniseField(field)}</td>
                                      <td className="px-2 py-1 text-red-300/90 max-w-[320px] break-words whitespace-pre-wrap">{fmtValue(field, change.from)}</td>
                                      <td className="px-2 py-1 text-emerald-300/90 max-w-[320px] break-words whitespace-pre-wrap">{fmtValue(field, change.to)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </details>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-white/30">Showing the most recent {logs.length} entries.</p>
      </div>
    </AdminShell>
  );
}
