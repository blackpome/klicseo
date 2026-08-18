import "server-only";
import { supabase } from "./supabase";
import { currentAdmin } from "./admin-auth";
import { getAdminUser } from "./admin-users";
import type { LeadListRow, NewLeadList, LeadListItem } from "./leadLists-shared";
import type { LeadRow } from "./leads";
import { sealFields, unsealFields } from "./crypto";

/**
 * Insert a new lead list.
 * @param list - The lead list data (name, optional created_by, optional assigned_employee_id)
 * @returns The created lead list row
 */
export async function insertLeadList(list: NewLeadList): Promise<LeadListRow> {
  // Get current admin to set created_by if not provided
  const admin = await currentAdmin();
  if (!admin) {
    throw new Error("No admin authenticated");
  }
  const adminRow = await getAdminUser(admin.email);

  const payload = {
    ...list,
    created_by: list.created_by ?? adminRow?.id ?? null,
    // assigned_employee_id is already in list or will be undefined/null
  };

  const { data, error } = await supabase()
    .from("lead_lists")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as LeadListRow;
}

/**
 * List lead lists with optional filtering.
 * @param opts - Options: createdBy to filter by creator
 * @returns Array of lead list rows with lead count and creator/admin details
 */
export async function listLeadLists(opts: {
  createdBy?: string;
  assignedAdminUserId?: string;
  search?: string;
} = {}): Promise<LeadListRow[]> {
  let q = supabase()
    .from("lead_lists")
    .select(`
      *,
      admin_users:created_by (email)
    `)
    .order("created_at", { ascending: false });

  if (opts.createdBy) {
    q = q.eq("created_by", opts.createdBy);
  }

  if (opts.assignedAdminUserId) {
    q = q.eq("assigned_admin_user_id", opts.assignedAdminUserId);
  }

  if (opts.search) {
    // Search by list name
    q = q.ilike("name", `%${opts.search}%`);
  }

  const { data, error } = await q;
  if (error) throw error;

  const assignedAdminUserIds = Array.from(
    new Set(
      (data ?? []).map((r: any) => r?.assigned_admin_user_id).filter(Boolean),
    ),
  );

  let assignedUsersById: Record<string, { email: string | null; name: string | null }> = {};
  if (assignedAdminUserIds.length > 0) {
    const { data: assignedUsers, error: assignedUsersErr } = await supabase()
      .from("admin_users")
      .select("id, email, employees:employee_id (name)")
      .in("id", assignedAdminUserIds);
    if (assignedUsersErr) throw assignedUsersErr;
      assignedUsersById = (assignedUsers ?? []).reduce(
        (acc: Record<string, { email: string | null; name: string | null }>, u: any) => {
          if (u?.id) {
            const empName = Array.isArray(u.employees) ? u.employees[0]?.name ?? null : u.employees?.name ?? null;
            acc[u.id] = { email: u.email ?? null, name: empName ?? u.email ?? null };
          }
          return acc;
        },
        {},
      );
    }

  // Flatten the joined data and add lead count
  const result = await Promise.all(
    (data ?? []).map(async (row: any) => {
      // Get lead count for this list
      const countResult = await supabase()
        .from("lead_list_items")
        .select("lead_id", { count: "exact" })
        .eq("list_id", row.id);

      const leadCount = countResult.count ?? 0;
      const assignedAdminUser = row.assigned_admin_user_id
        ? assignedUsersById[row.assigned_admin_user_id] ?? { email: null, name: null }
        : null;

      return {
        ...row,
        assigned_admin_user: assignedAdminUser,
        lead_count: leadCount,
      } as LeadListRow;
    }),
  );

  return result;
}

/**
 * Get a single lead list by ID.
 * @param listId - The ID of the lead list
 * @returns The lead list row or null if not found
 */
export async function getLeadList(listId: string): Promise<LeadListRow | null> {
  const { data, error } = await supabase()
    .from("lead_lists")
    .select(`
      *,
      admin_users:created_by (email)
    `)
    .eq("id", listId)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  // Get lead count
  const countResult = await supabase()
    .from("lead_list_items")
    .select("lead_id", { count: "exact" })
    .eq("list_id", listId);

  const leadCount = countResult.count ?? 0;

  const assignedAdminUser = data.assigned_admin_user_id
    ? await (async () => {
        const { data: assignedUser, error: assignedUserErr } = await supabase()
          .from("admin_users")
          .select("id, email, employees:employee_id (name)")
          .eq("id", data.assigned_admin_user_id)
          .maybeSingle();
        if (assignedUserErr) throw assignedUserErr;
        if (!assignedUser) return null;
        const au: any = assignedUser;
        const empName = Array.isArray(au.employees) ? au.employees[0]?.name ?? null : au.employees?.name ?? null;
        return { email: assignedUser.email ?? null, name: empName ?? assignedUser.email ?? null };
      })()
    : null;

  return {
    ...data,
    assigned_admin_user: assignedAdminUser,
    admin_users: data.admin_users,
    lead_count: leadCount,
  } as LeadListRow;
}

/**
 * Add leads to a lead list.
 * @param listId - The ID of the lead list
 * @param leadIds - Array of lead IDs to add
 */
export async function addLeadsToList(listId: string, leadIds: string[]): Promise<void> {
  if (leadIds.length === 0) return;

  const items = leadIds.map(leadId => ({
    list_id: listId,
    lead_id: leadId
  }));

  const { error } = await supabase()
    .from("lead_list_items")
    .upsert(items, { onConflict: "list_id,lead_id", ignoreDuplicates: true });

  if (error) throw error;
}

/**
 * Remove a lead from a lead list.
 * @param listId - The ID of the lead list
 * @param leadId - The ID of the lead to remove
 */
export async function removeLeadFromList(listId: string, leadId: string): Promise<void> {
  const { error } = await supabase()
    .from("lead_list_items")
    .delete()
    .eq("list_id", listId)
    .eq("lead_id", leadId);

  if (error) throw error;
}

/**
 * Get all leads in a specific lead list.
 * @param listId - The ID of the lead list
 * @param opts - Pagination options
 * @returns Array of lead rows (unsealed)
 */
export async function getLeadsInList(listId: string, opts: {
  limit?: number;
  offset?: number;
  status?: string | "all";
  search?: string;
} = {}): Promise<LeadRow[]> {
  const ENCRYPTED_LEAD_FIELDS = [
    "phone",
    "car_number",
    "address",
    "map_link",
    "gate_access_notes",
    "notes",
  ] as const;

  // We need to join lead_list_items with leads and unseal the lead fields
  let q = supabase()
    .from("lead_list_items")
    .select(`
      lead_id,
      leads:lead_id (*)
    `)
    .eq("list_id", listId);

  if (opts.limit) {
    q = q.limit(opts.limit);
  }

  if (opts.offset) {
    q = q.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);
  }

  const { data, error } = await q;

  if (error) throw error;

  // Flatten the joined data and unseal encrypted fields
  const leads = (data ?? [])
    .map((item: any) => item.leads)
    .filter(Boolean)
    .map((lead: any) => unsealFields(lead, ENCRYPTED_LEAD_FIELDS as unknown as string[]));

  // In-memory filtering if needed
  let filtered = leads;

  if (opts.status && opts.status !== "all") {
    filtered = filtered.filter((lead: any) => lead.status === opts.status);
  }

  if (opts.search) {
    const s = opts.search.toLowerCase();
    filtered = filtered.filter((lead: any) =>
      lead.name?.toLowerCase().includes(s) ||
      lead.phone?.includes(s) ||
      lead.car_brand?.toLowerCase().includes(s) ||
      lead.car_model?.toLowerCase().includes(s)
    );
  }

  return filtered as LeadRow[];
}

/**
 * Update a lead list (name or assigned employee).
 * @param listId - The ID of the lead list
 * @param updates - Partial updates for the list
 */
export async function updateLeadList(listId: string, updates: Partial<NewLeadList>): Promise<void> {
  const { error } = await supabase()
    .from("lead_lists")
    .update(updates)
    .eq("id", listId);

  if (error) throw error;
}

/**
 * Delete a lead list and all its items.
 * @param listId - The ID of the lead list to delete
 */
export async function deleteLeadList(listId: string): Promise<void> {
  // 1. Delete junction table entries
  await supabase()
    .from("lead_list_items")
    .delete()
    .eq("list_id", listId);

  // 2. Set foreign references to null
  await supabase()
    .from("lead_allocation_schedules")
    .update({ target_list_id: null })
    .eq("target_list_id", listId);

  // 3. Delete the lead list
  const { error } = await supabase()
    .from("lead_lists")
    .delete()
    .eq("id", listId);

  if (error) throw error;
}

/**
 * Check if a lead is assigned to a specific admin user.
 * @param leadId - The ID of the lead
 * @param adminUserId - The ID of the admin user
 * @returns boolean
 */
export async function isLeadAssignedToAdmin(leadId: string, adminUserId: string): Promise<boolean> {
  const { data, error } = await supabase()
    .from("lead_list_items")
    .select("lead_id, lead_lists!inner(assigned_admin_user_id)")
    .eq("lead_id", leadId)
    .eq("lead_lists.assigned_admin_user_id", adminUserId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
