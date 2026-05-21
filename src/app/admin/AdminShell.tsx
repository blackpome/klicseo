import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin-auth";
import { type Permission } from "@/lib/admin-users-shared";
import { listCallReminders, type CallReminder } from "@/lib/leads";
import Sidebar, { type NavGroup } from "./Sidebar";

// Wraps authed admin pages with the sidebar + real HMAC signature check and the
// live allowlist lookup. Login/forgot/reset pages deliberately render bare.
//
// Pass `require` to gate a page on a specific permission: if the signed-in user
// lacks it, they get an "access denied" panel instead of the page body.
export default async function AdminShell({
  children,
  require,
}: {
  children: React.ReactNode;
  require?: Permission;
}) {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");

  const can = (p: Permission) => me.permissions.includes(p);
  const canManageAccess = me.role === "super_admin" || me.role === "admin";
  const denied = require != null && !can(require);

  // Build nav groups, hiding anything the user can't reach.
  const groups: NavGroup[] = [];

  const leadsItems = [
    can("leads.view") && { href: "/admin", label: "All Leads", icon: "Inbox" as const, exact: true },
    can("leads.manage") && { href: "/admin/new", label: "Add Lead", icon: "PlusCircle" as const },
  ].filter(Boolean) as NavGroup["items"];
  if (leadsItems.length) groups.push({ title: "Leads", items: leadsItems });

  const employeeItems = [
    can("employees.view") && { href: "/admin/employees", label: "All Employees", icon: "Users" as const },
    can("employees.manage") && { href: "/admin/employees/new", label: "Add Employee", icon: "UserPlus" as const },
  ].filter(Boolean) as NavGroup["items"];
  if (employeeItems.length) groups.push({ title: "Employees", items: employeeItems });

  if (canManageAccess) {
    groups.push({
      title: "Settings",
      items: [{ href: "/admin/access", label: "Team", icon: "UserCog" }],
    });
  }

  // Call reminders power the notification bell — only for users who can see leads.
  let reminders: CallReminder[] = [];
  if (can("leads.view")) {
    try {
      reminders = await listCallReminders();
    } catch {
      reminders = []; // a DB hiccup shouldn't break the whole shell
    }
  }

  return (
    <div className="min-h-screen md:pl-64">
      <Sidebar
        groups={groups}
        email={me.email}
        role={me.role}
        reminders={reminders}
        showBell={can("leads.view")}
      />
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        {denied ? (
          <div className="mx-auto max-w-md text-center py-24">
            <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
              No access
            </h1>
            <p className="text-white/45 text-sm">
              Your account doesn’t have permission to view this section. Ask an admin if you need it.
            </p>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
