import AdminShell from "./AdminShell";
import AdminError from "./AdminError";
import { listLeads, type LeadStatus } from "@/lib/leads";
import LeadStatusControl from "./LeadStatusControl";
import Link from "next/link";

const STATUS_TABS: { id: LeadStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "booked", label: "Booked" },
  { id: "cancelled", label: "Cancelled" },
];

const STATUS_COLOR: Record<LeadStatus, string> = {
  new: "#3B82F6",
  contacted: "#C9A84C",
  booked: "#10b981",
  cancelled: "#EF4444",
};

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const filter = (STATUS_TABS.find((t) => t.id === status)?.id ?? "all") as LeadStatus | "all";

  let leads;
  try {
    leads = await listLeads({ status: filter, search: q });
  } catch (err) {
    return (
      <AdminShell>
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
    <AdminShell>
      <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
            Leads
          </h1>
          <p className="text-white/45 text-sm">{leads.length} shown</p>
        </div>
        <form className="flex gap-2 items-center">
          {filter !== "all" && <input type="hidden" name="status" value={filter} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, phone, car #, model, address, service…"
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
          <button className="text-xs px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15">Search</button>
        </form>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_TABS.map((t) => {
          const active = filter === t.id;
          const href = `/admin${t.id === "all" ? "" : `?status=${t.id}`}${q ? `${t.id === "all" ? "?" : "&"}q=${encodeURIComponent(q)}` : ""}`;
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
                    <a href={`tel:${l.phone}`} className="text-[#C9A84C] hover:underline">{l.phone}</a>
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
