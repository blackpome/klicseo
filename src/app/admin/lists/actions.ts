"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import {
  insertLeadList,
  listLeadLists,
  getLeadList,
  updateLeadList,
  deleteLeadList,
  addLeadsToList,
  removeLeadFromList,
  getLeadsInList,
} from "@/lib/leadLists";
import { listLeads } from "@/lib/leads";
import { listAssignableAdminUsers } from "@/lib/admin-users";
import { logAudit } from "@/lib/audit";
import type { LeadStatus } from "@/lib/leads-shared";

/**
 * Create a new lead list action.
 * Used by the lead list creation form.
 */
export async function createLeadListAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string; redirectTo?: string }> {
  await requirePermission("leads.manage");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "List name is required" };
  }
  const assigned_admin_user_id = String(formData.get("assigned_admin_user_id") ?? "").trim() || null;

  if (assigned_admin_user_id) {
    const adminUsers = await listAssignableAdminUsers();
    const allowed = adminUsers.some((u) => u.id === assigned_admin_user_id);
    if (!allowed) {
      return { error: "Cannot assign to a team member without admin panel access." };
    }
  }

  try {
    const list = await insertLeadList({
      name,
      assigned_admin_user_id,
    });

    await logAudit("lead_list.create", {
      entity: "lead_list",
      entityId: list.id,
      summary: `Created lead list "${list.name}"`,
    });

    revalidatePath("/admin/lists");
    return { redirectTo: `/admin/lists/${list.id}` };
  } catch (err) {
    console.error("Failed to create lead list:", err);
    return { error: "Failed to create lead list" };
  }
}

/**
 * Update a lead list action.
 * Used by the lead list edit form.
 */
export async function updateLeadListAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string; redirectTo?: string }> {
  await requirePermission("leads.manage");

  const listId = String(formData.get("id") ?? "");
  if (!listId) {
    return { error: "Missing list ID" };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "List name is required" };
  }
  const assigned_admin_user_id = String(formData.get("assigned_admin_user_id") ?? "").trim() || null;

  if (assigned_admin_user_id) {
    const adminUsers = await listAssignableAdminUsers();
    const allowed = adminUsers.some((u) => u.id === assigned_admin_user_id);
    if (!allowed) {
      return { error: "Cannot assign to a team member without admin panel access." };
    }
  }

  try {
    await updateLeadList(listId, {
      name,
      assigned_admin_user_id,
    });

    await logAudit("lead_list.update", {
      entity: "lead_list",
      entityId: listId,
      summary: `Updated lead list "${name}"`,
    });

    revalidatePath("/admin/lists");
    return { redirectTo: `/admin/lists/${listId}` };
  } catch (err) {
    console.error("Failed to update lead list:", err);
    return { error: "Failed to update lead list" };
  }
}

/**
 * Add leads to a list action.
 * Used when selecting leads from the leads list and adding to a list.
 */
export async function addLeadsToListAction(formData: FormData): Promise<{ error?: string }> {
  await requirePermission("leads.manage");

  const listId = String(formData.get("listId") ?? "");
  if (!listId) {
    return { error: "Missing list ID" };
  }

  const leadIds = formData.getAll("leadIds"); // This will be an array of strings from checkboxes
  if (leadIds.length === 0) {
    return { error: "No leads selected" };
  }

  try {
    await addLeadsToList(listId, leadIds as string[]);

    // Get list name for audit log
    const list = await getLeadList(listId);
    const listName = list?.name || "Unknown";

    await logAudit("lead_list.add_leads", {
      entity: "lead_list",
      entityId: listId,
      summary: `Added ${leadIds.length} leads to list "${listName}"`,
    });

    revalidatePath(`/admin/lists/${listId}`);
    revalidatePath("/admin"); // Revalidate leads list in case we show list info there
    return { error: undefined };
  } catch (err) {
    console.error("Failed to add leads to list:", err);
    return { error: "Failed to add leads to list" };
  }
}

/**
 * Remove a lead from a list action.
 */
export async function removeLeadFromListAction(formData: FormData): Promise<{ error?: string }> {
  await requirePermission("leads.manage");

  const listId = String(formData.get("listId") ?? "");
  const leadId = String(formData.get("leadId") ?? "");

  if (!listId || !leadId) {
    return { error: "Missing list ID or lead ID" };
  }

  try {
    await removeLeadFromList(listId, leadId);

    // Get list name for audit log
    const list = await getLeadList(listId);
    const listName = list?.name || "Unknown";

    await logAudit("lead_list.remove_lead", {
      entity: "lead_list",
      entityId: listId,
      summary: `Removed lead from list "${listName}"`,
    });

    revalidatePath(`/admin/lists/${listId}`);
    return { error: undefined };
  } catch (err) {
    console.error("Failed to remove lead from list:", err);
    return { error: "Failed to remove lead from list" };
  }
}

/**
 * Delete a lead list action.
 */
export async function deleteLeadListAction(formData: FormData): Promise<void> {
  await requirePermission("leads.manage");

  const listId = String(formData.get("id") ?? "");
  if (!listId) return;

  try {
    // Get list name for audit log before deletion
    const list = await getLeadList(listId);
    const listName = list?.name || "Unknown";

    await deleteLeadList(listId);

    await logAudit("lead_list.delete", {
      entity: "lead_list",
      entityId: listId,
      summary: `Deleted lead list "${listName}"`,
    });

    revalidatePath("/admin/lists");
    redirect("/admin/lists");
  } catch (err) {
    console.error("Failed to delete lead list:", err);
    // Redirect back with error? For now, just redirect to lists page
    redirect("/admin/lists");
  }
}

/**
 * Get leads in a list for display in the list view page.
 */
export async function getLeadsInListAction(
  listId: string,
  opts: {
    limit?: number;
    offset?: number;
    status?: LeadStatus | "all";
    search?: string;
  } = {}
): Promise<{ leads: any[]; count: number }> {
  await requirePermission("leads.view");

  try {
    const leads = await getLeadsInList(listId, opts);

    // Get total count for pagination
    const { count } = await supabase()
      .from("lead_list_items")
      .select("lead_id", { count: "exact" })
      .eq("list_id", listId);

    return {
      leads,
      count: count ?? 0,
    };
  } catch (err) {
    console.error("Failed to get leads in list:", err);
    return { leads: [], count: 0 };
  }
}

export async function searchLeadsForListAction(search: string): Promise<any[]> {
  await requirePermission("leads.view");

  const q = search.trim();
  if (!q) return [];

  try {
    return await listLeads({
      search: q,
      limit: 20,
      excludeStatuses: ["draft"],
    });
  } catch (err) {
    console.error("Failed to search leads for list:", err);
    return [];
  }
}
