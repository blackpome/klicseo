import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import AdminShell from "../AdminShell";
import AdminError from "../AdminError";
import UserTable from "./UserTable";
import { currentAdmin } from "@/lib/admin-auth";
import { listAdminUsers, type AdminUserRow } from "@/lib/admin-users";
import { listEmployees } from "@/lib/employees";
import type { EmployeeRow } from "@/lib/employees-shared";

// Always render fresh — admin actions on this page (invite/revoke/force-logout)
// mutate the allowlist and the UI needs to reflect the new state instantly.
export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  if (me.role !== "super_admin" && me.role !== "admin") {
    return (
      <AdminShell>
        <div className="mx-auto max-w-md text-center py-24">
          <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-playfair)" }}>No access</h1>
          <p className="text-white/45 text-sm">Only admins can manage access.</p>
        </div>
      </AdminShell>
    );
  }

  let users: AdminUserRow[] = [];
  let employees: EmployeeRow[] = [];
  try {
    users = await listAdminUsers();
    const linkedIds = new Set(users.map((u) => u.employee_id).filter(Boolean) as string[]);
    employees = linkedIds.size > 0 ? (await listEmployees({ limit: 100 })).filter((e) => linkedIds.has(e.id)) : [];
  } catch (err) {
    return (
      <AdminShell>
        <AccessHeader />
        <AdminError err={err} />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6 max-w-4xl">
        <AccessHeader />
        <UserTable
          users={users}
          meRole={me.role}
          meEmail={me.email}
          canMakeAdmin={me.role === "super_admin"}
          employees={employees}
        />
      </div>
    </AdminShell>
  );
}

function AccessHeader() {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/25">
        <ShieldCheck className="text-[#C9A84C]" size={22} />
      </div>
      <div>
        <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
          User management
        </h1>
        <p className="text-white/45 text-sm">
          Invite teammates and control exactly what each one can access.
        </p>
      </div>
    </div>
  );
}
