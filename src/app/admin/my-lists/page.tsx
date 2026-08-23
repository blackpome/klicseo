import AdminShell from "../AdminShell";
import AdminError from "../AdminError";
import { currentAdmin } from "@/lib/admin-auth";
import { getAdminUser, listAssignableAdminUsers } from "@/lib/admin-users";
import { listLeadLists } from "@/lib/leadLists";
import type { LeadListRow } from "@/lib/leadLists-shared";
import StaffDatewiseLeadListsView from "./StaffDatewiseLeadListsView";

export default async function MyListsPage() {
  const me = await currentAdmin();
  const user = me ? await getAdminUser(me.email) : null;

  if (!user) {
    return (
      <AdminShell require="leads.view">
        <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-[#071228] p-8 text-center space-y-3">
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-playfair)" }}>
            No admin account found
          </h1>
          <p className="text-xs text-white/45">You must be signed in with an admin account to access your assigned lists.</p>
        </div>
      </AdminShell>
    );
  }

  const isSuperAdmin = me?.role === "super_admin";

  let lists: LeadListRow[] = [];
  let adminUsers: { id: string; email: string; name: string }[] = [];

  try {
    if (isSuperAdmin) {
      const [allLists, users] = await Promise.all([
        listLeadLists(),
        listAssignableAdminUsers(),
      ]);
      lists = allLists;
      adminUsers = users.map((u) => ({ id: u.id, email: u.email, name: u.name }));
    } else {
      lists = await listLeadLists({ assignedAdminUserId: user.id });
    }
  } catch (err) {
    return (
      <AdminShell require="leads.view">
        <AdminError err={err} />
      </AdminShell>
    );
  }

  const currentUserData = {
    id: user.id,
    email: user.email,
    name: user.employees?.name || user.email.split("@")[0],
    role: me?.role || "staff",
  };

  return (
    <AdminShell require="leads.view">
      <StaffDatewiseLeadListsView
        lists={lists}
        currentUser={currentUserData}
        isSuperAdmin={isSuperAdmin}
        adminUsers={adminUsers}
      />
    </AdminShell>
  );
}
