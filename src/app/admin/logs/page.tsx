import { redirect } from "next/navigation";
import Link from "next/link";
import { ScrollText, Download } from "lucide-react";
import AdminShell from "../AdminShell";
import AdminError from "../AdminError";
import { currentAdmin } from "@/lib/admin-auth";
import { listAuditLogs, pruneOldAuditLogs, AUDIT_ENTITIES, type AuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ENTITY_TABS = ["all", ...AUDIT_ENTITIES] as const;

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; entity?: string }>;
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

  // Enforce the 6-month retention window whenever an admin opens this page.
  await pruneOldAuditLogs();

  const { q, entity } = await searchParams;
  let logs: AuditLog[] = [];
  let error: unknown = null;
  try {
    logs = await listAuditLogs({ search: q, entity });
  } catch (err) {
    error = err;
  }

  const filterHref = (e: string) =>
    `/admin/logs?entity=${e}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <AdminShell>
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/25">
            <ScrollText className="text-[#C9A84C]" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>Audit logs</h1>
            <p className="text-white/45 text-sm">Every admin action, newest first — for investigations. Kept for 6 months.</p>
          </div>
          <a
            href="/api/admin/export?table=audit_logs"
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 px-3 py-2 text-xs font-semibold"
          >
            <Download size={14} /> Export CSV
          </a>
        </div>

        {/* Search */}
        <form className="flex gap-2 items-center">
          {entity && <input type="hidden" name="entity" value={entity} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search actor, action, summary, id…"
            className="flex-1 max-w-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
          <button className="text-xs px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15">Search</button>
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
                {logs.map((l) => (
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-white/30">Showing the most recent {logs.length} entries.</p>
      </div>
    </AdminShell>
  );
}
