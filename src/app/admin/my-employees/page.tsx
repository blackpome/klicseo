import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import AdminShell from "../AdminShell";
import AdminError from "../AdminError";
import { currentAdmin } from "@/lib/admin-auth";
import { getAdminUser } from "@/lib/admin-users";
import { listEmployees } from "@/lib/employees";
import type { EmployeeRow } from "@/lib/employees-shared";

export default async function MyEmployeesPage() {
  const me = await currentAdmin();
  const user = me ? await getAdminUser(me.email) : null;

  if (!user) {
    return (
      <AdminShell require="employees.view" section="employees">
        <div className="max-w-xl rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#C9A84C]/15 text-[#C9A84C]">
            <Users size={22} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
            No admin account
          </h1>
          <p className="text-sm text-white/45">You must be signed in with an admin account to see your employees.</p>
        </div>
      </AdminShell>
    );
  }

  let employees: EmployeeRow[] = [];
  try {
    employees = await listEmployees({ assignedAdminUserId: user.id });
  } catch (err) {
    return (
      <AdminShell require="employees.view" section="employees">
        <AdminError err={err} />
      </AdminShell>
    );
  }

  return (
    <AdminShell require="employees.view" section="employees">
      <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
            My Employees
          </h1>
          <p className="text-white/45 text-sm">{employees.length} assigned to {user.employees?.name ?? "you"}</p>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-16 text-white/40 text-sm">No employees are assigned to you yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-white/50 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Name</th>
                <th className="px-3 py-2 text-left font-semibold">Phone</th>
                <th className="px-3 py-2 text-left font-semibold">Role</th>
                <th className="px-3 py-2 text-left font-semibold">Open</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e, i) => (
                <tr key={e.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-2 text-white/40 text-xs tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/employees/${e.id}`} className="hover:text-[#C9A84C] hover:underline">
                      {e.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{e.phone}</td>
                  <td className="px-3 py-2 text-xs">{e.job_role}</td>
                  <td className="px-3 py-2 text-center">
                    <Link
                      href={`/admin/employees/${e.id}`}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/10 text-white/70 hover:text-white hover:bg-white/15"
                    >
                      Open <ArrowRight size={12} />
                    </Link>
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
