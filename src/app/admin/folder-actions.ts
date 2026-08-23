"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-auth";
import { insertLeadList, addLeadsToList, removeLeadFromList } from "@/lib/leadLists";
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
    const list = await insertLeadList({
      name,
      assigned_admin_user_id: formData.assignedAdminUserId || null,
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
