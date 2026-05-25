import Link from "next/link";
import AdminShell from "../AdminShell";
import AdminError from "../AdminError";
import EmployeeStatusControl from "./EmployeeStatusControl";
import WhatsAppLink from "@/components/WhatsAppLink";
import ExportToolbar from "@/components/ExportToolbar";
import { listEmployees, type EmployeeStatus } from "@/lib/employees";
import { jobTitleMap } from "@/lib/jobs";

const STATUS_TABS: { id: EmployeeStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "applied", label: "Applied" },
  { id: "screening", label: "Screening" },
  { id: "hired", label: "Hired" },
  { id: "active", label: "Active" },
  { id: "resigned", label: "Resigned" },
  { id: "rejected", label: "Rejected" },
];

const STATUS_COLOR: Record<EmployeeStatus, string> = {
  applied: "#3B82F6",
  screening: "#C9A84C",
  hired: "#8B5CF6",
  active: "#10b981",
  resigned: "#94a3b8",
  rejected: "#EF4444",
};

export default async function AdminEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const filter = (STATUS_TABS.find((t) => t.id === status)?.id ?? "all") as EmployeeStatus | "all";

  let employees;
  let roleLabel: Record<string, string> = {};
  try {
    employees = await listEmployees({ status: filter, search: q });
    roleLabel = await jobTitleMap();
  } catch (err) {
    return (
      <AdminShell require="employees.view">
        <div className="max-w-3xl space-y-4">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
            Employees
          </h1>
          <AdminError err={err} />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell require="employees.view">
      <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
            Employees
          </h1>
          <p className="text-white/45 text-sm">{employees.length} shown</p>
        </div>
        <form className="flex gap-2 items-center">
          {filter !== "all" && <input type="hidden" name="status" value={filter} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, phone, location, role…"
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
          <button className="text-xs px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15">Search</button>
        </form>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_TABS.map((t) => {
          const active = filter === t.id;
          const href = `/admin/employees${t.id === "all" ? "" : `?status=${t.id}`}${
            q ? `${t.id === "all" ? "?" : "&"}q=${encodeURIComponent(q)}` : ""
          }`;
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

      <ExportToolbar endpoint="/api/admin/employees-export" label="employees" />

      {employees.length === 0 ? (
        <div className="text-center py-16 text-white/40 text-sm">No employees match this filter yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-white/50 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">When</th>
                <th className="text-left px-3 py-2 font-semibold">Name</th>
                <th className="text-left px-3 py-2 font-semibold">Phone</th>
                <th className="text-left px-3 py-2 font-semibold">Role</th>
                <th className="text-left px-3 py-2 font-semibold">Location</th>
                <th className="text-right px-3 py-2 font-semibold">Salary</th>
                <th className="text-left px-3 py-2 font-semibold">Joining</th>
                <th className="text-left px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-2 whitespace-nowrap text-white/60 text-xs">
                    {new Date(e.created_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    <Link href={`/admin/employees/${e.id}`} className="hover:text-[#C9A84C] hover:underline">
                      {e.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <a href={`tel:${e.phone}`} className="text-[#C9A84C] hover:underline">{e.phone}</a>
                      <WhatsAppLink phone={e.phone} label={`WhatsApp ${e.name ?? e.phone ?? ""}`.trim()} />
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{roleLabel[e.job_role] ?? e.job_role}</td>
                  <td className="px-3 py-2 text-xs text-white/70">{e.location ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {e.salary != null ? `₹${e.salary.toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">{e.joining_date ?? "—"}</td>
                  <td className="px-3 py-2">
                    <EmployeeStatusControl id={e.id} status={e.status} color={STATUS_COLOR[e.status]} />
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
