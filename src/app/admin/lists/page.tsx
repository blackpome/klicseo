import { redirect, notFound } from "next/navigation";
import AdminShell from "../AdminShell";
import AdminError from "../AdminError";
import { listLeadLists } from "@/lib/leadLists";
import { listScheduledAllocations, listStaffWorkload } from "@/lib/lead-routing";
import { listAssignableAdminUsers } from "@/lib/admin-users";
import { currentAdmin } from "@/lib/admin-auth";
import LeadListsWorkspaceClient from "./LeadListsWorkspaceClient";

export default async function LeadListsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const me = await currentAdmin();
  if (!me || !me.permissions.includes("leads.view")) {
    return redirect("/admin/login");
  }

  if (me.role !== "super_admin") notFound();

  const { q } = await searchParams;

  try {
    const [lists, schedules, staffWorkload, adminUsers] = await Promise.all([
      listLeadLists({ search: q }),
      listScheduledAllocations(),
      listStaffWorkload(),
      listAssignableAdminUsers(),
    ]);

    return (
      <AdminShell require="leads.view">
        <LeadListsWorkspaceClient
          initialLists={lists}
          initialSchedules={schedules}
          initialStaffWorkload={staffWorkload}
          adminUsers={adminUsers.map((u) => ({ id: u.id, email: u.email, name: u.name }))}
          searchQuery={q ?? ""}
        />
      </AdminShell>
    );
  } catch (err) {
    return (
      <AdminShell require="leads.view">
        <div className="max-w-3xl space-y-4">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
            Lead Lists & Staff Allocation
          </h1>
          <AdminError err={err} />
        </div>
      </AdminShell>
    );
  }
}
