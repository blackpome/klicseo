"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin, resolveScope } from "@/lib/admin-auth";
import { getAdminUser } from "@/lib/admin-users";
import { insertLeadList, addLeadsToList, removeLeadFromList, getLeadList } from "@/lib/leadLists";
import { assertLeadInScope } from "@/lib/leads";
import { logAudit } from "@/lib/audit";
import { invalidateAssignedLeadsCache, markLeadsAsAssigned } from "@/lib/lead-routing";

export interface CreateFolderResult {
  ok: boolean;
  folderId?: string;
  error?: string;
}

export async function createFolderAction(formData: {
  name: string;
  assignedAdminUserId?: string | null;
}): Promise<CreateFolderResult> {
  const me = await currentAdmin();
  if (!me || !me.permissions.includes("leads.manage")) {
    return { ok: false, error: "Unauthorized" };
  }

  const name = formData.name.trim();
  if (!name) {
    return { ok: false, error: "Folder name is required." };
  }

  try {
    const adminRow = me.email ? await getAdminUser(me.email) : null;
    const assignedUserId = me.role === "staff" ? (adminRow?.id || null) : (formData.assignedAdminUserId || null);

    const list = await insertLeadList({
      name,
      assigned_admin_user_id: assignedUserId,
    });

    await logAudit("create", {
      entity: "lead_lists",
      entityId: list.id,
      summary: `Created lead folder: ${list.name}`,
      metadata: { name: list.name, assigned_admin_user_id: list.assigned_admin_user_id },
    });

    invalidateAssignedLeadsCache();
    revalidatePath("/admin");
    revalidatePath("/admin/lists");

    return { ok: true, folderId: list.id };
  } catch (err: any) {
    console.error("createFolderAction error:", err);
    return { ok: false, error: err.message || "Failed to create folder." };
  }
}

export async function moveLeadToFolderAction(
  leadId: string,
  targetListId: string,
): Promise<{ ok: boolean; error?: string }> {
  const me = await currentAdmin();
  if (!me || !me.permissions.includes("leads.manage")) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const scope = (await resolveScope(me)) ?? { kind: "all" as const };
    await assertLeadInScope(leadId, scope);

    // If staff, verify destination folder is also assigned to them
    if (me.role === "staff" && scope.kind === "assigned") {
      const targetList = await getLeadList(targetListId);
      if (!targetList || targetList.assigned_admin_user_id !== scope.adminUserId) {
        return { ok: false, error: "Forbidden: Cannot move lead to another staff's folder." };
      }
    }

    await addLeadsToList(targetListId, [leadId]);
    markLeadsAsAssigned([leadId]);

    await logAudit("update", {
      entity: "lead_lists",
      entityId: targetListId,
      summary: `Moved lead to folder`,
      metadata: { movedLeadId: leadId },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/lists");
    return { ok: true };
  } catch (err: any) {
    console.error("moveLeadToFolderAction error:", err);
    return { ok: false, error: err.message || "Failed to move lead to folder." };
  }
}

export async function removeLeadFromFolderAction(
  listId: string,
  leadId: string,
): Promise<{ ok: boolean; error?: string }> {
  const me = await currentAdmin();
  if (!me || !me.permissions.includes("leads.manage")) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const scope = (await resolveScope(me)) ?? { kind: "all" as const };
    await assertLeadInScope(leadId, scope);

    await removeLeadFromList(listId, leadId);
    invalidateAssignedLeadsCache();

    revalidatePath("/admin");
    revalidatePath("/admin/lists");
    return { ok: true };
  } catch (err: any) {
    console.error("removeLeadFromFolderAction error:", err);
    return { ok: false, error: err.message || "Failed to remove lead from folder." };
  }
}

export async function bulkMoveLeadsToFolderAction(
  leadIds: string[],
  targetListId: string,
): Promise<{ ok: boolean; count?: number; error?: string }> {
  const me = await currentAdmin();
  if (!me || !me.permissions.includes("leads.manage")) {
    return { ok: false, error: "Unauthorized" };
  }

  if (!leadIds || leadIds.length === 0) {
    return { ok: false, error: "No leads selected." };
  }

  try {
    await addLeadsToList(targetListId, leadIds);
    markLeadsAsAssigned(leadIds);

    await logAudit("update", {
      entity: "lead_lists",
      entityId: targetListId,
      summary: `Moved ${leadIds.length} leads to folder`,
      metadata: { count: leadIds.length },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/lists");
    return { ok: true, count: leadIds.length };
  } catch (err: any) {
    console.error("bulkMoveLeadsToFolderAction error:", err);
    return { ok: false, error: err.message || "Failed to move leads to folder." };
  }
}
