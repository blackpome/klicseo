import { redirect } from "next/navigation";
import Link from "next/link";
import AdminShell from "../AdminShell";
import AdminError from "../AdminError";
import EmployeeStatusControl from "./EmployeeStatusControl";
import WhatsAppLink from "@/components/WhatsAppLink";
import { Pencil, UploadCloud, Plus, Search } from "lucide-react";
import DeleteEmployeeButton from "./[id]/DeleteEmployeeButton";
import ExportToolbar from "@/components/ExportToolbar";
import EmployeeBulkTable from "@/app/admin/EmployeeBulkTable";
import { listAssignableAdminUsers, getAdminUser } from "@/lib/admin-users";
import { listEmployees, type EmployeeStatus, listJobCounts } from "@/lib/employees";
import { currentAdmin, resolveScope } from "@/lib/admin-auth";
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

function buildEmployeesHref(args: { status?: EmployeeStatus | "all"; q?: string | undefined; role?: string | undefined }): string {
  const params = new URLSearchParams();
  if (args.status && args.status !== "all") params.set("status", args.status);
  if (args.q) params.set("q", args.q);
  if (args.role) params.set("role", args.role);
  const s = params.toString();
  return `/admin/employees${s ? `?${s}` : ""}`;
}

export default async function AdminEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; role?: string }>;
}) {
  const me = await currentAdmin();
  if (!me) return redirect("/admin/login");

  const canCreate = me.permissions.includes("employees.manage");
  const { status, q, role } = await searchParams;
  const filter = (STATUS_TABS.find((t) => t.id === status)?.id ?? "all") as EmployeeStatus | "all";
  const roleFilter = role && role !== "all" ? role : undefined;

  // Resolve scope: super_admin sees all; everyone else sees only their assigned rows.
  const scope = (await resolveScope(me)) ?? { kind: "all" as const };
  const isSuperAdmin = me.role === "super_admin";
  const assignedAdminUserId = scope.kind === "assigned" ? scope.adminUserId : undefined;

  let employees;
  let roleLabel: Record<string, string> = {};
  let adminUsers: Array<{ id: string; email: string; name: string }> = [];
  let jobCounts: Array<{ job_role: string; count: number }> = [];
  try {
    const canManage = Boolean(me?.permissions.includes("employees.manage"));
    [employees, roleLabel, adminUsers] = await Promise.all([
      listEmployees({ status: filter, search: q, assignedAdminUserId, jobRole: roleFilter }),
      jobTitleMap(),
      canManage ? listAssignableAdminUsers() : Promise.resolve([]),
    ]);

    // Job counts for the pill bar — scoped to the caller's visible employees.
    jobCounts = await listJobCounts({ assignedAdminUserId });
  } catch (err) {
    return (
      <AdminShell require="employees.view" section="employees">
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
    <AdminShell require="employees.view" section="employees">
      <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {isSuperAdmin ? "Staff & Employees" : "My Assigned Staff"}
          </h1>
          <p className="text-white/45 text-xs mt-0.5">{employees.length} team members shown</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {canCreate ? (
            <div className="flex items-center gap-2">
              <Link
                href="/admin/employees/upload"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white/80 hover:text-white hover:bg-white/[0.08] hover:border-[#C9A84C]/40 text-xs font-semibold transition-all shadow-sm"
              >
                <UploadCloud size={14} className="text-[#C9A84C]" />
                <span>Upload Employees</span>
              </Link>

              <Link
                href="/admin/employees/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#C9A84C] to-[#E8CC7A] text-[#050E21] hover:brightness-105 shadow-md shadow-[#C9A84C]/20"
              >
                <Plus size={14} />
                <span>Add Employee</span>
              </Link>
            </div>
          ) : null}
          <form className="flex gap-2 items-center">
            {filter !== "all" && <input type="hidden" name="status" value={filter} />}
            {roleFilter && <input type="hidden" name="role" value={roleFilter} />}
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search name, phone, location…"
                className="bg-[#050E21] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#C9A84C]"
              />
            </div>
            <button className="text-xs px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 font-semibold text-white/80">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_TABS.map((t) => {
          const active = filter === t.id;
          const href = buildEmployeesHref({ status: t.id, q, role: roleFilter });
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

      {jobCounts && jobCounts.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <span className="text-[10px] uppercase tracking-wider text-white/35 mr-1">Role</span>
          <Link href={buildEmployeesHref({ status: filter, q })} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${!roleFilter ? "bg-white/15 text-white" : "bg-white/[0.04] text-white/55 hover:bg-white/10"}`}>
            All <span className="text-white/35">·</span> {jobCounts.reduce((n, a) => n + a.count, 0)}
          </Link>
          {jobCounts.slice(0, 20).map((a) => {
            const active = roleFilter === a.job_role;
            const href = buildEmployeesHref({ status: filter, q, role: a.job_role });
            return (
              <Link
                key={a.job_role}
                href={href}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  active ? "bg-[#C9A84C] text-[#050E21]" : "bg-white/[0.04] text-white/55 hover:bg-white/10"
                }`}
              >
                {roleLabel[a.job_role] ?? a.job_role} <span className={active ? "text-[#050E21]/60" : "text-white/35"}>{a.count}</span>
              </Link>
            );
          })}
        </div>
      )}

      <ExportToolbar endpoint="/api/admin/employees-export" label="employees" />

      {employees.length === 0 ? (
        <div className="text-center py-16 text-white/40 text-sm space-y-2">
          {isSuperAdmin ? (
            <>
              <div>No employees match this filter yet.</div>
              {canCreate ? (
                <div>
                  <Link href="/admin/employees/new" className="text-[#C9A84C] hover:underline">
                    Add your first employee
                  </Link>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div>No employees are assigned to you yet.</div>
              <div className="text-xs">Ask a super-admin to assign employees to you.</div>
            </>
          )}
        </div>
      ) : (
        <EmployeeBulkTable employees={employees} adminUsers={adminUsers} canManageEmployees={Boolean(me.permissions.includes("employees.manage"))} />
      )}
    </AdminShell>
  );
}
