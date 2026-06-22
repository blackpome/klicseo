import { redirect, notFound } from "next/navigation";
import AdminShell from "../../AdminShell";
import AdminError from "../../AdminError";
import { getLeadList, getLeadsInList } from "@/lib/leadLists";
import type { LeadListRow } from "@/lib/leadLists-shared";
import LeadListDetailClient from "./LeadListDetailClient";
import { currentAdmin, resolveScope } from "@/lib/admin-auth";

export default async function LeadListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await currentAdmin();

  let list: LeadListRow | null = null;
  let leads: Awaited<ReturnType<typeof getLeadsInList>> = [];
  let notFoundError = false;

  try {
    list = await getLeadList(id);
    if (!list) {
      // Non-super-admins don't have access to /admin/lists; send them to my-lists.
      if (me && me.role !== "super_admin") redirect("/admin/my-lists");
      else redirect("/admin/lists");
    }

    // Scope guard: non-super-admins may only view lists assigned to them.
    if (me && me.role !== "super_admin") {
      const scope = (await resolveScope(me)) ?? { kind: "all" as const };
      if (scope.kind === "assigned" && list.assigned_admin_user_id !== scope.adminUserId) {
        notFoundError = true;
      }
    }

    if (!notFoundError) {
      leads = await getLeadsInList(id, { limit: 100 });
    }
  } catch (err) {
    return (
      <AdminShell require="leads.view">
        <AdminError err={err} />
      </AdminShell>
    );
  }

  if (notFoundError) notFound();
  if (!list) return null;

  return (
    <AdminShell require="leads.view">
      <LeadListDetailClient list={list} initialLeads={leads} isSuperAdmin={me?.role === "super_admin"} />
    </AdminShell>
  );
}
