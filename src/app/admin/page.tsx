import { redirect } from "next/navigation";
import AdminShell from "./AdminShell";
import AdminError from "./AdminError";
import { listLeads, mapLeadIdsToLists } from "@/lib/leads";
import { listAreasWithCounts } from "@/lib/area";
import { LEAD_STATUSES, LEAD_STATUS_COLOR, LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/leads-shared";
import { listLeadLists } from "@/lib/leadLists";
import type { LeadListRow } from "@/lib/leadLists-shared";
import { currentAdmin } from "@/lib/admin-auth";
import { getAdminUser } from "@/lib/admin-users";
import Link from "next/link";
import ExportToolbar from "@/components/ExportToolbar";
import LeadBulkListTable from "./LeadBulkListTable";

const STATUS_TABS: { id: LeadStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  ...LEAD_STATUSES.map((s) => ({ id: s, label: LEAD_STATUS_LABEL[s] })),
];

const STATUS_COLOR = LEAD_STATUS_COLOR;

function buildLeadsHref(args: { status: LeadStatus | "all"; q?: string; area?: string }): string {
  const params = new URLSearchParams();
  if (args.status !== "all") params.set("status", args.status);
  if (args.q) params.set("q", args.q);
  if (args.area) params.set("area", args.area);
  const s = params.toString();
  return `/admin${s ? `?${s}` : ""}`;
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; area?: string }>;
}) {
  // Leads is the default landing page. Route users who can't see leads to a
  // section they can, so they don't hit a dead "no access" screen on sign-in.
  const me = await currentAdmin();
  if (me && !me.permissions.includes("leads.view")) {
    if (me.permissions.includes("employees.view")) redirect("/admin/employees");
    if (me.role === "super_admin" || me.role === "admin") redirect("/admin/access");
  }

  const { status, q, area } = await searchParams;
  const filter = (STATUS_TABS.find((t) => t.id === status)?.id ?? "all") as LeadStatus | "all";
  const areaFilter = area && area !== "all" ? area : undefined;

  // Lead visibility scoping:
  //   - super_admin sees everything.
  //   - admin + staff see only leads that appear in at least one list assigned
  //     to them. This matches the lead-lists feature's telecaller workflow and
  //     is enforced server-side via the lib (so a stale client can't bypass).
  const isSuperAdmin = me?.role === "super_admin";
  const assignedAdminUserId = isSuperAdmin
    ? undefined
    : me
      ? (await getAdminUser(me.email))?.id ?? undefined
      : undefined;

  let leads;
  let leadLists: LeadListRow[] = [];
  let areaCounts: { area: string; count: number }[] = [];
  let leadListNames: Map<string, string[]> = new Map();
  try {
    const canManageLists = Boolean(me?.permissions.includes("leads.manage"));
    [leads, areaCounts, leadLists] = await Promise.all([
      // Drafts are wizard partial-saves; surface them only behind the Draft
      // tab so they don't drown out actionable leads.
      listLeads({
        status: filter,
        search: q,
        area: areaFilter,
        excludeStatuses: filter === "all" ? ["draft"] : undefined,
        assignedAdminUserId,
      }),
      listAreasWithCounts(),
      canManageLists ? listLeadLists({ assignedAdminUserId }) : Promise.resolve([]),
    ]);
    // For super_admin, fetch which lists each lead belongs to (shown in table).
    if (isSuperAdmin && leads.length > 0) {
      leadListNames = await mapLeadIdsToLists(leads.map((l) => l.id));
    }
  } catch (err) {
    return (
      <AdminShell require="leads.view">
        <div className="max-w-3xl space-y-4">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
            Leads
          </h1>
          <AdminError err={err} />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell require="leads.view">
      <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
            {isSuperAdmin ? "Leads" : "My Leads"}
          </h1>
          <p className="text-white/45 text-sm">
            {leads.length} shown
            {!isSuperAdmin && leadLists.length > 0 && (
              <>
                {" · "}
                <Link href="/admin/my-lists" className="text-[#C9A84C] hover:underline">
                  view my lists
                </Link>
              </>
            )}
          </p>
        </div>
        <form className="flex gap-2 items-center">
          {filter !== "all" && <input type="hidden" name="status" value={filter} />}
          {areaFilter && <input type="hidden" name="area" value={areaFilter} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, area, phone, car #, model…"
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
          <button className="text-xs px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15">Search</button>
        </form>
      </div>

      {/* Build a URL preserving the current status/search/area params, with
          one of them overridden. Centralised so the pill bars don't drift. */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {STATUS_TABS.map((t) => {
          const active = filter === t.id;
          const href = buildLeadsHref({ status: t.id, q, area: areaFilter });
          return (
            <Link
              key={t.id}
              href={href}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                active ? "bg-[#C9A84C] text-[#050E21]" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {areaCounts.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <span className="text-[10px] uppercase tracking-wider text-white/35 mr-1">Area</span>
          <Link
            href={buildLeadsHref({ status: filter, q, area: undefined })}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
              !areaFilter ? "bg-white/15 text-white" : "bg-white/[0.04] text-white/55 hover:bg-white/10"
            }`}
          >
            All <span className="text-white/35">·</span> {areaCounts.reduce((n, a) => n + a.count, 0)}
          </Link>
          {areaCounts.slice(0, 20).map((a) => {
            const active = areaFilter === a.area;
            return (
              <Link
                key={a.area}
                href={buildLeadsHref({ status: filter, q, area: a.area })}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  active ? "bg-[#C9A84C] text-[#050E21]" : "bg-white/[0.04] text-white/55 hover:bg-white/10"
                }`}
              >
                {a.area} <span className={active ? "text-[#050E21]/60" : "text-white/35"}>{a.count}</span>
              </Link>
            );
          })}
        </div>
      )}

      <ExportToolbar endpoint="/api/admin/leads-export" label="leads" />

      {leads.length === 0 ? (
        <div className="text-center py-16 text-white/40 text-sm space-y-2">
          {isSuperAdmin ? (
            <div>No leads match this filter yet.</div>
          ) : (
            <>
              <div>No leads in your assigned lists match this filter.</div>
              {leadLists.length === 0 && (
                <div className="text-xs">
                  You don&apos;t have any lists assigned yet.{" "}
                  <Link href="/admin/my-lists" className="text-[#C9A84C] hover:underline">
                    See your lists
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <LeadBulkListTable
          leads={leads}
          lists={leadLists}
          statusColor={STATUS_COLOR}
          canManageLists={Boolean(me?.permissions.includes("leads.manage"))}
          leadListNames={leadListNames}
        />
      )}
    </AdminShell>
  );
}
