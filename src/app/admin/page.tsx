import { redirect } from "next/navigation";
import Link from "next/link";
import {
  UploadCloud,
  Plus,
  Search,
  Users,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  MapPin,
  X,
} from "lucide-react";
import AdminShell from "./AdminShell";
import AdminError from "./AdminError";
import {
  listPaginatedLeads,
  mapLeadIdsToLists,
  listServiceCounts,
  listLeadStatusSummary,
} from "@/lib/leads";
import { listAreasWithCounts } from "@/lib/area";
import {
  LEAD_STATUSES,
  LEAD_STATUS_COLOR,
  LEAD_STATUS_LABEL,
  type LeadStatus,
} from "@/lib/leads-shared";
import { getSiteSettings } from "@/lib/site-settings";
import { DEFAULT_LEAD_STATUS_ITEMS, type CustomLeadStatus } from "@/lib/site-settings-shared";
import { listLeadLists } from "@/lib/leadLists";
import type { LeadListRow } from "@/lib/leadLists-shared";
import { currentAdmin, resolveScope } from "@/lib/admin-auth";
import { getAdminUser } from "@/lib/admin-users";
import ExportToolbar from "@/components/ExportToolbar";
import Pagination from "@/components/Pagination";
import LeadBulkListTable from "./LeadBulkListTable";

function buildLeadsHref(args: {
  status?: string;
  q?: string;
  area?: string;
  service?: string;
  page?: number;
  pageSize?: number;
}): string {
  const params = new URLSearchParams();
  if (args.status && args.status !== "all") params.set("status", args.status);
  if (args.q) params.set("q", args.q);
  if (args.area && args.area !== "all") params.set("area", args.area);
  if (args.service && args.service !== "all") params.set("service", args.service);
  if (args.page && args.page > 1) params.set("page", String(args.page));
  if (args.pageSize && args.pageSize !== 25) params.set("pageSize", String(args.pageSize));
  const s = params.toString();
  return `/admin${s ? `?${s}` : ""}`;
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    area?: string;
    service?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const me = await currentAdmin();
  if (me && !me.permissions.includes("leads.view")) {
    if (me.permissions.includes("employees.view")) redirect("/admin/employees");
    if (me.role === "super_admin" || me.role === "admin") redirect("/admin/access");
  }

  const siteSettings = await getSiteSettings();
  const configuredStatuses: CustomLeadStatus[] =
    siteSettings.leadStatuses && siteSettings.leadStatuses.length > 0
      ? siteSettings.leadStatuses
      : DEFAULT_LEAD_STATUS_ITEMS;

  const statusTabs: { id: string; label: string }[] = [
    { id: "all", label: "All Leads" },
    ...configuredStatuses.map((s) => ({ id: s.id, label: s.label })),
  ];

  const statusColorMap: Record<string, string> = Object.fromEntries(
    configuredStatuses.map((s) => [s.id, s.color]),
  );

  const canManage = Boolean(me?.permissions.includes("leads.manage"));
  const { status, q, area, service, page: pageParam, pageSize: pageSizeParam } = await searchParams;
  const filter = statusTabs.find((t) => t.id === status)?.id ?? "all";
  const areaFilter = area && area !== "all" ? area : undefined;
  const serviceFilter = service && service !== "all" ? service : undefined;

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const pageSize = Math.max(1, Math.min(100, parseInt(pageSizeParam ?? "25", 10) || 25));

  const isSuperAdmin = me?.role === "super_admin";
  const scope = me ? ((await resolveScope(me)) ?? { kind: "all" as const }) : { kind: "all" as const };
  const assignedAdminUserId = scope.kind === "assigned" ? scope.adminUserId : undefined;

  let paginated;
  let statusSummary;
  let leadLists: LeadListRow[] = [];
  let areaCounts: { area: string; count: number }[] = [];
  let serviceCounts: { service: string; count: number }[] = [];
  let leadListNames: Map<string, string[]> = new Map();

  try {
    const canManageLists = Boolean(me?.permissions.includes("leads.manage"));
    [paginated, statusSummary, areaCounts, leadLists, serviceCounts] = await Promise.all([
      listPaginatedLeads({
        status: filter as any,
        search: q,
        area: areaFilter,
        service: serviceFilter,
        assignedAdminUserId,
        page,
        pageSize,
      }),
      listLeadStatusSummary({
        assignedAdminUserId,
        search: q,
        area: areaFilter,
        service: serviceFilter,
      }),
      listAreasWithCounts(assignedAdminUserId),
      canManageLists ? listLeadLists({ assignedAdminUserId }) : Promise.resolve([]),
      listServiceCounts({ assignedAdminUserId, area: areaFilter }),
    ]);

    if (isSuperAdmin && paginated.leads.length > 0) {
      leadListNames = await mapLeadIdsToLists(paginated.leads.map((l) => l.id));
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

  const { leads, totalCount, totalPages } = paginated;

  const conversionRate =
    statusSummary.total > 0
      ? Math.round((statusSummary.booked / statusSummary.total) * 100)
      : 0;

  return (
    <AdminShell require="leads.view">
      <div className="space-y-6">
        {/* Page Title & Action Strip */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold tracking-tight text-white"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {isSuperAdmin ? "Leads CRM" : "My Assigned Leads"}
            </h1>
            <p className="text-xs text-white/50 mt-0.5">
              Manage client inquiries, telecaller follow-ups, and booking conversions.
              {!isSuperAdmin && leadLists.length > 0 && (
                <>
                  {" · "}
                  <Link href="/admin/my-lists" className="text-[#C9A84C] hover:underline">
                    View my lists ({leadLists.length})
                  </Link>
                </>
              )}
            </p>
          </div>

          {canManage && (
            <div className="flex items-center gap-2.5">
              <Link
                href="/admin/upload"
                className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white/80 hover:text-white hover:bg-white/[0.08] hover:border-[#C9A84C]/40 text-xs font-semibold transition-all inline-flex items-center gap-2 shadow-sm"
              >
                <UploadCloud size={14} className="text-[#C9A84C]" />
                <span>Upload Leads</span>
              </Link>

              <Link
                href="/admin/new"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E8CC7A] text-[#050E21] text-xs font-bold hover:brightness-105 transition-all inline-flex items-center gap-1.5 shadow-md shadow-[#C9A84C]/20"
              >
                <Plus size={15} />
                <span>Add Lead</span>
              </Link>
            </div>
          )}
        </div>

        {/* Hero KPI Stat Strip (Astryx Metrics) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Total Leads */}
          <Link
            href={buildLeadsHref({ status: "all", area: areaFilter, service: serviceFilter })}
            className={`p-4 rounded-2xl border transition-all ${
              filter === "all"
                ? "bg-[#C9A84C]/10 border-[#C9A84C]/40 ring-1 ring-[#C9A84C]/20"
                : "bg-[#071228] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center justify-between text-white/50 text-[11px] font-semibold uppercase tracking-wider mb-2">
              <span>Total Active Leads</span>
              <Users size={16} className="text-[#C9A84C]" />
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">
              {statusSummary.total}
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              Active CRM database
            </div>
          </Link>

          {/* Card 2: New Leads */}
          <Link
            href={buildLeadsHref({ status: "new", area: areaFilter, service: serviceFilter })}
            className={`p-4 rounded-2xl border transition-all ${
              filter === "new"
                ? "bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/20"
                : "bg-[#071228] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center justify-between text-blue-300 text-[11px] font-semibold uppercase tracking-wider mb-2">
              <span>New (To Call)</span>
              <Sparkles size={16} className="text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-400 tabular-nums">
              {statusSummary.new}
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              Awaiting first contact
            </div>
          </Link>

          {/* Card 3: Contacted / In Progress */}
          <Link
            href={buildLeadsHref({ status: "contacted", area: areaFilter, service: serviceFilter })}
            className={`p-4 rounded-2xl border transition-all ${
              filter === "contacted"
                ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20"
                : "bg-[#071228] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center justify-between text-amber-300 text-[11px] font-semibold uppercase tracking-wider mb-2">
              <span>Contacted / Follow-up</span>
              <PhoneCall size={16} className="text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 tabular-nums">
              {statusSummary.contacted + statusSummary.follow_up + statusSummary.call_not_responded}
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              In telecalling cycle
            </div>
          </Link>

          {/* Card 4: Booked Conversions */}
          <Link
            href={buildLeadsHref({ status: "booked", area: areaFilter, service: serviceFilter })}
            className={`p-4 rounded-2xl border transition-all ${
              filter === "booked"
                ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20"
                : "bg-[#071228] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center justify-between text-emerald-300 text-[11px] font-semibold uppercase tracking-wider mb-2">
              <span>Booked Conversions</span>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-emerald-400 tabular-nums">
                {statusSummary.booked}
              </div>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                {conversionRate}% conv.
              </span>
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              Confirmed customers
            </div>
          </Link>
        </div>

        {/* Unified Astryx Filter Command Bar */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#071228] p-4 space-y-4 shadow-lg">
          {/* Status Tabs Segmented Control */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {statusTabs.map((t) => {
              const active = filter === t.id;
              const count =
                t.id === "all"
                  ? statusSummary.total
                  : statusSummary[t.id as keyof typeof statusSummary] ?? 0;

              return (
                <Link
                  key={t.id}
                  href={buildLeadsHref({
                    status: t.id,
                    q,
                    area: areaFilter,
                    service: serviceFilter,
                  })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    active
                      ? "bg-[#C9A84C] text-[#050E21] shadow-sm"
                      : "bg-white/[0.02] text-white/60 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      active
                        ? "bg-[#050E21]/20 text-[#050E21]"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Search, Area & Service Filters */}
          <div className="flex items-center justify-between gap-3 flex-wrap border-t border-white/[0.06] pt-3">
            <form className="flex-1 min-w-[260px] flex items-center gap-2">
              {filter !== "all" && <input type="hidden" name="status" value={filter} />}
              {areaFilter && <input type="hidden" name="area" value={areaFilter} />}
              {serviceFilter && <input type="hidden" name="service" value={serviceFilter} />}

              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  type="search"
                  name="q"
                  defaultValue={q ?? ""}
                  placeholder="Search name, phone, car #, model, area…"
                  className="w-full bg-[#050E21] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#C9A84C]"
                />
              </div>

              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-xs font-semibold text-white/80 transition-colors border border-white/10"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Area Quick Filter */}
              {areaCounts.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-white/40" />
                  <div className="flex gap-1 flex-wrap">
                    <Link
                      href={buildLeadsHref({ status: filter, q, area: "all", service: serviceFilter })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        !areaFilter
                          ? "bg-white/15 text-white"
                          : "text-white/40 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      All Areas
                    </Link>
                    {areaCounts.slice(0, 4).map((a) => (
                      <Link
                        key={a.area}
                        href={buildLeadsHref({
                          status: filter,
                          q,
                          area: a.area,
                          service: serviceFilter,
                        })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          areaFilter === a.area
                            ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                            : "text-white/40 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {a.area} <span className="opacity-50">({a.count})</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Filter Clear Tag */}
              {(q || areaFilter || serviceFilter) && (
                <Link
                  href={buildLeadsHref({ status: filter })}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 text-[11px] font-medium hover:bg-rose-500/20 inline-flex items-center gap-1 transition-colors"
                >
                  <X size={12} /> Clear Filters
                </Link>
              )}

              <ExportToolbar endpoint="/api/admin/leads-export" label="leads" />
            </div>
          </div>
        </div>

        {/* Data Table or Empty State */}
        {leads.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#071228] p-12 text-center space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-white/30">
              <Users size={24} />
            </div>
            <h3 className="text-sm font-semibold text-white">No matching leads found</h3>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              Try adjusting your search criteria or status filter, or upload a new spreadsheet batch.
            </p>
            {canManage && (
              <div className="pt-2">
                <Link
                  href="/admin/upload"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C9A84C] text-xs font-bold text-[#050E21] hover:bg-[#E8CC7A]"
                >
                  <UploadCloud size={14} /> Upload Leads
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <LeadBulkListTable
              leads={leads}
              lists={leadLists}
              statusColor={statusColorMap}
              canManageLists={Boolean(me?.permissions.includes("leads.manage"))}
              leadListNames={leadListNames}
              customStatuses={configuredStatuses}
            />

            {/* Pagination Controls */}
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              totalPages={totalPages}
              buildHref={(newPage, newPageSize) =>
                buildLeadsHref({
                  status: filter,
                  q,
                  area: areaFilter,
                  service: serviceFilter,
                  page: newPage,
                  pageSize: newPageSize ?? pageSize,
                })
              }
            />
          </div>
        )}
      </div>
    </AdminShell>
  );
}
