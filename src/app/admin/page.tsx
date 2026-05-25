import { redirect } from "next/navigation";
import AdminShell from "./AdminShell";
import AdminError from "./AdminError";
import { listLeads } from "@/lib/leads";
import { listAreasWithCounts } from "@/lib/area";
import { LEAD_STATUSES, LEAD_STATUS_COLOR, LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/leads-shared";
import { currentAdmin } from "@/lib/admin-auth";
import LeadStatusControl from "./LeadStatusControl";
import Link from "next/link";
import WhatsAppLink from "@/components/WhatsAppLink";
import ExportToolbar from "@/components/ExportToolbar";

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

  let leads;
  let areaCounts: { area: string; count: number }[] = [];
  try {
    [leads, areaCounts] = await Promise.all([
      // Drafts are wizard partial-saves; surface them only behind the Draft
      // tab so they don't drown out actionable leads.
      listLeads({
        status: filter,
        search: q,
        area: areaFilter,
        excludeStatuses: filter === "all" ? ["draft"] : undefined,
      }),
      listAreasWithCounts(),
    ]);
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
            Leads
          </h1>
          <p className="text-white/45 text-sm">{leads.length} shown</p>
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
        <div className="text-center py-16 text-white/40 text-sm">No leads match this filter yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-white/50 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">When</th>
                <th className="text-left px-3 py-2 font-semibold">Name</th>
                <th className="text-left px-3 py-2 font-semibold">Phone</th>
                <th className="text-left px-3 py-2 font-semibold">Service</th>
                <th className="text-left px-3 py-2 font-semibold">Vehicle</th>
                <th className="text-left px-3 py-2 font-semibold">Shift</th>
                <th className="text-left px-3 py-2 font-semibold">GPS</th>
                <th className="text-right px-3 py-2 font-semibold">Price</th>
                <th className="text-left px-3 py-2 font-semibold">Source</th>
                <th className="text-left px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-2 whitespace-nowrap text-white/60 text-xs">
                    {new Date(l.created_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    <Link href={`/admin/${l.id}`} className="hover:text-[#C9A84C] hover:underline">
                      {l.name ?? "(unnamed)"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <a href={`tel:${l.phone}`} className="text-[#C9A84C] hover:underline">{l.phone}</a>
                      <WhatsAppLink phone={l.phone} label={`WhatsApp ${l.name ?? l.phone ?? ""}`.trim()} />
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div>{l.service ?? "—"}</div>
                    <div className="text-[11px] text-white/45">{l.service_option ?? ""}{l.interior_add_on ? " + interior" : ""}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div>{[l.car_brand, l.car_model].filter(Boolean).join(" ") || l.vehicle_type || "—"}</div>
                    <div className="text-[11px] text-white/45">{[l.vehicle_type, l.car_number].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{l.shift ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    {l.map_link ? (
                      <a
                        href={l.map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#3B82F6] hover:underline"
                      >
                        Map ↗
                      </a>
                    ) : l.latitude != null && l.longitude != null ? (
                      <a
                        href={`https://www.google.com/maps?q=${l.latitude},${l.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#3B82F6] hover:underline"
                      >
                        Map ↗
                      </a>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">{l.price_total != null ? `₹${l.price_total.toLocaleString("en-IN")}` : "—"}</td>
                  <td className="px-3 py-2 text-[11px] text-white/50">{l.source}</td>
                  <td className="px-3 py-2">
                    <LeadStatusControl id={l.id} status={l.status} color={STATUS_COLOR[l.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
