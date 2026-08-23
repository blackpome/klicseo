import "server-only";
import { supabase } from "./supabase";
import { addLeadsToList, insertLeadList } from "./leadLists";
import type {
  LeadAllocationFilter,
  LeadAllocationSchedule,
  NewLeadAllocationRequest,
  StaffAssignedListInfo,
  StaffWorkloadSummary,
  RecycleLeadsRequest,
  RecycleLeadsResult,
} from "./lead-routing-shared";

export * from "./lead-routing-shared";

/**
 * In-memory / unit-test filter matcher for a lead.
 */
export function matchesFilter(
  lead: {
    area?: string | null;
    address?: string | null;
    pincode?: string | null;
    service?: string | null;
    price_total?: number | null;
  },
  filter: LeadAllocationFilter,
): boolean {
  if (!filter) return true;

  // 1. Area (checks both area column and permanent address text)
  if (filter.areas && filter.areas.length > 0) {
    const leadArea = String(lead.area ?? "").toLowerCase().trim();
    const leadAddress = String(lead.address ?? "").toLowerCase().trim();
    const matched = filter.areas.some((area) => {
      const a = area.toLowerCase().trim();
      return (leadArea && leadArea.includes(a)) || (leadAddress && leadAddress.includes(a));
    });
    if (!matched) return false;
  }

  // 2. Pincodes
  if (filter.pincodes && filter.pincodes.length > 0) {
    const leadPin = String(lead.pincode ?? "").trim();
    const matched = filter.pincodes.some((pin) => leadPin.includes(pin.trim()));
    if (!matched) return false;
  }

  // 3. Service
  if (filter.services && filter.services.length > 0) {
    const leadService = String(lead.service ?? "").toLowerCase().trim();
    if (!leadService) return false;

    const matched = filter.services.some((srv) =>
      leadService.includes(srv.toLowerCase().trim()),
    );
    if (!matched) return false;
  }

  // 4. Minimum Order Price
  if (filter.min_price != null && filter.min_price > 0) {
    const price = lead.price_total ?? 0;
    if (price < filter.min_price) return false;
  }

  return true;
}

/**
 * Fetch all assigned lead IDs in batches to avoid PostgREST max_rows limits.
 */
export async function getAllAssignedLeadIds(): Promise<Set<string>> {
  const set = new Set<string>();
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data, error } = await supabase()
      .from("lead_list_items")
      .select("lead_id")
      .range(from, from + batchSize - 1);
    if (error || !data || data.length === 0) break;
    for (const item of data) {
      if (item.lead_id) set.add(item.lead_id);
    }
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return set;
}

/**
 * Count matching unallocated leads available in the pool (excluding already-assigned leads and booked leads).
 */
export async function countMatchingLeads(
  filter: LeadAllocationFilter,
): Promise<{ count: number; totalUnallocated: number }> {
  try {
    const hasFilters = Boolean(
      (filter.areas && filter.areas.length > 0) ||
      (filter.pincodes && filter.pincodes.length > 0) ||
      (filter.services && filter.services.length > 0) ||
      (filter.min_price != null && filter.min_price > 0),
    );

    // 1. Get total unbooked leads in the DB
    const { count: totalLeadsCount } = await supabase()
      .from("leads")
      .select("*", { count: "exact", head: true })
      .neq("status", "booked");

    // 2. Fetch all assigned lead IDs across all lists
    const assignedSet = await getAllAssignedLeadIds();
    const totalUnallocated = Math.max(0, (totalLeadsCount ?? 0) - assignedSet.size);

    if (!hasFilters) {
      return { count: totalUnallocated, totalUnallocated };
    }

    // 3. Count leads matching the filter
    let query = supabase()
      .from("leads")
      .select("id, area, address, pincode, service, price_total, status")
      .neq("status", "booked");

    if (filter.areas && filter.areas.length > 0) {
      const areaClauses = filter.areas
        .map((a) => {
          const s = a.trim();
          return `area.ilike.%${s}%,address.ilike.%${s}%`;
        })
        .join(",");
      query = query.or(areaClauses);
    }
    if (filter.pincodes && filter.pincodes.length > 0) {
      query = query.in("pincode", filter.pincodes);
    }
    if (filter.services && filter.services.length > 0) {
      query = query.in("service", filter.services);
    }
    if (filter.min_price != null && filter.min_price > 0) {
      query = query.gte("price_total", filter.min_price);
    }

    // Query in batches to get all matching candidates without 1000 row cap
    let matchingCandidates: any[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data, error } = await query.range(from, from + batchSize - 1);
      if (error || !data || data.length === 0) break;
      matchingCandidates.push(...data);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    const availableMatching = matchingCandidates.filter(
      (lead) => !assignedSet.has(lead.id) && matchesFilter(lead, filter),
    ).length;

    return { count: availableMatching, totalUnallocated };
  } catch (err) {
    console.error("countMatchingLeads error:", err);
    return { count: 0, totalUnallocated: 0 };
  }
}

/**
 * List all scheduled, recurring, and past lead allocations.
 */
export async function listScheduledAllocations(): Promise<LeadAllocationSchedule[]> {
  try {
    const { data, error } = await supabase()
      .from("lead_allocation_schedules")
      .select(`
        *,
        target_list:target_list_id (id, name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "42P01") return [];
      throw error;
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      created_at: row.created_at,
      scheduled_for: row.scheduled_for,
      status: row.status ?? "completed",
      schedule_mode: row.schedule_mode ?? "once_now",
      lead_count: row.lead_count ?? 10,
      conditions: row.conditions ?? {},
      assignee_ids: row.assignee_ids ?? [],
      target_list_id: row.target_list_id ?? null,
      target_list: row.target_list ?? null,
      recurring_time: row.recurring_time?.slice(0, 5) ?? "09:30",
      recurring_days: row.recurring_days ?? [1, 2, 3, 4, 5, 6],
      replenish_threshold: row.replenish_threshold ?? 5,
      allocated_lead_ids: row.allocated_lead_ids ?? [],
      notes: row.notes ?? null,
    }));
  } catch {
    return [];
  }
}

/**
 * Execute immediate allocation of N leads matching conditions, guaranteeing no duplicate assignments.
 */
export async function executeLeadAllocation(req: {
  lead_count: number;
  conditions: LeadAllocationFilter;
  assignee_ids: string[];
  target_list_id?: string | null;
  notes?: string | null;
  allocation_type?: "manual" | "scheduled" | "daily_recurring" | "queue_replenish";
}): Promise<{
  allocatedCount: number;
  leadIds: string[];
}> {
  // 1. Fetch already assigned lead IDs to strictly prevent duplicates
  let assignedSet = new Set<string>();
  if (req.target_list_id) {
    // If adding to a specific list, exclude leads already in this list
    const { data: existingInList } = await supabase()
      .from("lead_list_items")
      .select("lead_id")
      .eq("list_id", req.target_list_id)
      .range(0, 49999);
    assignedSet = new Set((existingInList ?? []).map((i) => i.lead_id));
  } else {
    // If assigning directly to staff rosters, exclude leads assigned to any active list
    assignedSet = await getAllAssignedLeadIds();
  }

  // 2. Fetch candidate leads from pool matching conditions
  const selectedLeadIds: string[] = [];
  let from = 0;
  const batchSize = Math.max(req.lead_count * 2, 500);

  while (selectedLeadIds.length < req.lead_count) {
    let query = supabase()
      .from("leads")
      .select("id, area, address, pincode, service, price_total, status")
      .neq("status", "booked")
      .order("created_at", { ascending: false });

    if (req.conditions.areas && req.conditions.areas.length > 0) {
      const areaClauses = req.conditions.areas
        .map((a) => {
          const s = a.trim();
          return `area.ilike.%${s}%,address.ilike.%${s}%`;
        })
        .join(",");
      query = query.or(areaClauses);
    }
    if (req.conditions.pincodes && req.conditions.pincodes.length > 0) {
      query = query.in("pincode", req.conditions.pincodes);
    }
    if (req.conditions.services && req.conditions.services.length > 0) {
      query = query.in("service", req.conditions.services);
    }
    if (req.conditions.min_price != null && req.conditions.min_price > 0) {
      query = query.gte("price_total", req.conditions.min_price);
    }

    const { data, error } = await query.range(from, from + batchSize - 1);
    if (error || !data || data.length === 0) break;

    for (const lead of data) {
      if (!assignedSet.has(lead.id) && matchesFilter(lead, req.conditions)) {
        selectedLeadIds.push(lead.id);
        if (selectedLeadIds.length >= req.lead_count) break;
      }
    }

    if (data.length < batchSize) break;
    from += batchSize;
  }

  if (selectedLeadIds.length === 0) {
    return { allocatedCount: 0, leadIds: [] };
  }

  const assignees = req.assignee_ids ?? [];

  if (req.target_list_id) {
    await addLeadsToList(req.target_list_id, selectedLeadIds);
  } else if (assignees.length > 0) {
    const leadsPerStaff = Math.ceil(selectedLeadIds.length / assignees.length);

    for (let i = 0; i < assignees.length; i++) {
      const staffId = assignees[i];
      const slice = selectedLeadIds.slice(i * leadsPerStaff, (i + 1) * leadsPerStaff);
      if (slice.length === 0) continue;

      const listName = `Allocated Leads (${new Date().toLocaleDateString("en-IN")})`;
      const list = await insertLeadList({
        name: listName,
        assigned_admin_user_id: staffId,
      });

      await addLeadsToList(list.id, slice);

      for (const leadId of slice) {
        await supabase().from("lead_allocations_log").insert({
          lead_id: leadId,
          assigned_to_admin_user_id: staffId,
          assigned_to_list_id: list.id,
          allocation_type: req.allocation_type ?? "manual",
          reason: req.notes || `Allocated in batch of ${selectedLeadIds.length} leads`,
        });
      }
    }
  }

  return {
    allocatedCount: selectedLeadIds.length,
    leadIds: selectedLeadIds,
  };
}

/**
 * Schedule or immediately execute a lead allocation request.
 */
export async function createAllocationSchedule(req: NewLeadAllocationRequest): Promise<{
  id?: string;
  allocatedCount?: number;
  mode: string;
}> {
  // 1. One-Time Immediate
  if (req.schedule_mode === "once_now") {
    const res = await executeLeadAllocation({
      lead_count: req.lead_count,
      conditions: req.conditions,
      assignee_ids: req.assignee_ids,
      target_list_id: req.target_list_id,
      notes: req.notes,
      allocation_type: "manual",
    });

    await supabase().from("lead_allocation_schedules").insert({
      scheduled_for: new Date().toISOString(),
      status: "completed",
      schedule_mode: "once_now",
      lead_count: req.lead_count,
      conditions: req.conditions,
      assignee_ids: req.assignee_ids,
      target_list_id: req.target_list_id ?? null,
      allocated_lead_ids: res.leadIds,
      notes: req.notes ?? null,
    });

    return { allocatedCount: res.allocatedCount, mode: "once_now" };
  }

  // 2. Daily Recurring Schedule
  if (req.schedule_mode === "daily_recurring") {
    const { data, error } = await supabase()
      .from("lead_allocation_schedules")
      .insert({
        scheduled_for: new Date().toISOString(),
        status: "active_recurring",
        schedule_mode: "daily_recurring",
        lead_count: req.lead_count,
        recurring_time: req.recurring_time ? `${req.recurring_time}:00` : "09:30:00",
        recurring_days: req.recurring_days ?? [1, 2, 3, 4, 5, 6],
        conditions: req.conditions,
        assignee_ids: req.assignee_ids,
        target_list_id: req.target_list_id ?? null,
        notes: req.notes ?? null,
      })
      .select("id")
      .single();

    if (error) throw error;
    return { id: data.id, mode: "daily_recurring" };
  }

  // 3. Queue Auto-Replenish on Completion
  if (req.schedule_mode === "queue_replenish") {
    // Immediately assign the first batch of leads right now so staff starts with leads
    const initialAllocation = await executeLeadAllocation({
      lead_count: req.lead_count,
      conditions: req.conditions,
      assignee_ids: req.assignee_ids,
      target_list_id: req.target_list_id,
      notes: req.notes || "Initial Auto-Refill batch allocation",
      allocation_type: "queue_replenish",
    });

    const { data, error } = await supabase()
      .from("lead_allocation_schedules")
      .insert({
        scheduled_for: new Date().toISOString(),
        status: "active_recurring",
        schedule_mode: "queue_replenish",
        lead_count: req.lead_count,
        replenish_threshold: req.replenish_threshold ?? 5,
        conditions: req.conditions,
        assignee_ids: req.assignee_ids,
        target_list_id: req.target_list_id ?? null,
        allocated_lead_ids: initialAllocation.leadIds,
        last_run_at: new Date().toISOString(),
        notes: req.notes ?? null,
      })
      .select("id")
      .single();

    if (error) throw error;
    return {
      id: data.id,
      allocatedCount: initialAllocation.allocatedCount,
      mode: "queue_replenish",
    };
  }

  // 4. One-Time Future Schedule
  const { data, error } = await supabase()
    .from("lead_allocation_schedules")
    .insert({
      scheduled_for: req.scheduled_for || new Date().toISOString(),
      status: "pending",
      schedule_mode: "once_scheduled",
      lead_count: req.lead_count,
      conditions: req.conditions,
      assignee_ids: req.assignee_ids,
      target_list_id: req.target_list_id ?? null,
      notes: req.notes ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id, mode: "once_scheduled" };
}

/**
 * Cancel a pending one-time schedule.
 */
export async function cancelScheduledAllocation(id: string): Promise<void> {
  const { error } = await supabase()
    .from("lead_allocation_schedules")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Pause an active recurring automation rule.
 */
export async function pauseScheduledAllocation(id: string): Promise<void> {
  const { error } = await supabase()
    .from("lead_allocation_schedules")
    .update({ status: "paused" })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Resume a paused recurring automation rule.
 */
export async function resumeScheduledAllocation(id: string): Promise<void> {
  const { error } = await supabase()
    .from("lead_allocation_schedules")
    .update({ status: "active_recurring" })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Permanently delete / remove a scheduled allocation or automation rule.
 */
export async function deleteScheduledAllocation(id: string): Promise<void> {
  const { error } = await supabase()
    .from("lead_allocation_schedules")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * List staff members with active workload summary, including assigned lists breakdown, completion rates, and total leads.
 */
export async function listStaffWorkload(): Promise<StaffWorkloadSummary[]> {
  const { data: adminUsers, error: usersErr } = await supabase()
    .from("admin_users")
    .select("id, email, role, employees:employee_id (name)")
    .eq("status", "active")
    .order("email");

  if (usersErr) throw usersErr;

  const { data: lists, error: listsErr } = await supabase()
    .from("lead_lists")
    .select("id, name, assigned_admin_user_id");

  if (listsErr) throw listsErr;

  const { data: listItems, error: itemsErr } = await supabase()
    .from("lead_list_items")
    .select(`
      list_id,
      lead_id,
      leads:lead_id (status)
    `);

  if (itemsErr) throw itemsErr;

  // Compute total & completed leads per list
  const statsByListId = new Map<string, { total: number; completed: number }>();
  for (const item of listItems ?? []) {
    const listId = item.list_id;
    const current = statsByListId.get(listId) ?? { total: 0, completed: 0 };
    current.total += 1;

    const lead: any = Array.isArray(item.leads) ? item.leads[0] : item.leads;
    const status = lead?.status ?? "new";
    const isCompleted = ["contacted", "booked", "cancelled", "follow_up"].includes(status);
    if (isCompleted) {
      current.completed += 1;
    }

    statsByListId.set(listId, current);
  }

  // Group lists by assigned admin user
  const listsByUser = new Map<string, StaffAssignedListInfo[]>();
  for (const l of lists ?? []) {
    if (l.assigned_admin_user_id) {
      const userLists = listsByUser.get(l.assigned_admin_user_id) ?? [];
      const stats = statsByListId.get(l.id) ?? { total: 0, completed: 0 };
      const pending = Math.max(0, stats.total - stats.completed);
      const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

      userLists.push({
        id: l.id,
        name: l.name,
        totalLeads: stats.total,
        completedLeads: stats.completed,
        pendingLeads: pending,
        completionRate: rate,
      });
      listsByUser.set(l.assigned_admin_user_id, userLists);
    }
  }

  return (adminUsers ?? []).map((u: any) => {
    const empName = Array.isArray(u.employees) ? u.employees[0]?.name : u.employees?.name;
    const name = empName || u.email.split("@")[0];
    const userLists = listsByUser.get(u.id) ?? [];
    
    const totalLeadsCount = userLists.reduce((sum, item) => sum + item.totalLeads, 0);
    const completedLeadsCount = userLists.reduce((sum, item) => sum + item.completedLeads, 0);
    const pendingLeadsCount = Math.max(0, totalLeadsCount - completedLeadsCount);
    const overallCompletionRate = totalLeadsCount > 0
      ? Math.round((completedLeadsCount / totalLeadsCount) * 100)
      : 0;

    return {
      adminUserId: u.id,
      name,
      email: u.email,
      role: u.role,
      totalLeadsCount,
      completedLeadsCount,
      pendingLeadsCount,
      overallCompletionRate,
      assignedListsCount: userLists.length,
      assignedLists: userLists,
    };
  });
}

/**
 * 1-Click transfer all campaign lists from one staff to another.
 */
export async function transferStaffLeads(
  fromAdminUserId: string,
  toAdminUserId: string,
  reason: string = "Staff reallocation",
): Promise<{ transferredCount: number }> {
  const { data: updatedLists, error: listErr } = await supabase()
    .from("lead_lists")
    .update({ assigned_admin_user_id: toAdminUserId })
    .eq("assigned_admin_user_id", fromAdminUserId)
    .select("id");

  if (listErr) throw listErr;

  return { transferredCount: updatedLists?.length ?? 0 };
}

/**
 * Serverless Auto-Refill Processor:
 * Inspects active queue_replenish rules. If any assigned telecaller's pending
 * leads drop below their threshold, it immediately refills their queue.
 */
export async function processQueueAutoRefills(): Promise<{ refilledStaffCount: number }> {
  try {
    const { data: activeRules, error } = await supabase()
      .from("lead_allocation_schedules")
      .select("*")
      .eq("status", "active_recurring")
      .eq("schedule_mode", "queue_replenish");

    if (error || !activeRules || activeRules.length === 0) return { refilledStaffCount: 0 };

    const workload = await listStaffWorkload();
    const workloadByAdminId = new Map(workload.map((w) => [w.adminUserId, w]));

    let refilled = 0;
    for (const rule of activeRules) {
      const threshold = rule.replenish_threshold ?? 5;
      const assignees = rule.assignee_ids ?? [];

      for (const adminId of assignees) {
        const staff = workloadByAdminId.get(adminId);
        const remaining = staff ? staff.pendingLeadsCount : 0;

        if (remaining <= threshold) {
          const res = await executeLeadAllocation({
            lead_count: rule.lead_count ?? 10,
            conditions: rule.conditions ?? {},
            assignee_ids: [adminId],
            target_list_id: rule.target_list_id,
            notes: `Auto-refill triggered (Queue ${remaining} <= ${threshold})`,
            allocation_type: "queue_replenish",
          });

          if (res.allocatedCount > 0) {
            refilled++;
            await supabase()
              .from("lead_allocation_schedules")
              .update({ last_run_at: new Date().toISOString() })
              .eq("id", rule.id);
          }
        }
      }
    }

    return { refilledStaffCount: refilled };
  } catch (err) {
    console.error("processQueueAutoRefills error:", err);
    return { refilledStaffCount: 0 };
  }
}

/**
 * Process pending one-time schedules and recurring daily releases.
 */
export async function processScheduledJobs(): Promise<{ executedCount: number }> {
  try {
    const now = new Date();
    const nowIso = now.toISOString();
    let executed = 0;

    // 1. Process pending one-time schedules due now
    const { data: pendingJobs } = await supabase()
      .from("lead_allocation_schedules")
      .select("*")
      .eq("status", "pending")
      .eq("schedule_mode", "once_scheduled")
      .lte("scheduled_for", nowIso);

    for (const job of pendingJobs ?? []) {
      const res = await executeLeadAllocation({
        lead_count: job.lead_count,
        conditions: job.conditions ?? {},
        assignee_ids: job.assignee_ids ?? [],
        target_list_id: job.target_list_id,
        notes: `Scheduled release executed`,
        allocation_type: "scheduled",
      });

      await supabase()
        .from("lead_allocation_schedules")
        .update({
          status: "completed",
          allocated_lead_ids: res.leadIds,
          last_run_at: nowIso,
        })
        .eq("id", job.id);

      executed++;
    }

    // 2. Process active daily recurring releases
    const { data: recurringRules } = await supabase()
      .from("lead_allocation_schedules")
      .select("*")
      .eq("status", "active_recurring")
      .eq("schedule_mode", "daily_recurring");

    if (recurringRules && recurringRules.length > 0) {
      const istDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // "YYYY-MM-DD"
      const istTimeStr = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }); // "HH:MM"
      const istDayOfWeekStr = now.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short" });
      const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const istDayOfWeek = dayMap[istDayOfWeekStr] ?? now.getDay();

      for (const rule of recurringRules) {
        const recurringDays: number[] = rule.recurring_days ?? [1, 2, 3, 4, 5, 6];
        const targetTime = (rule.recurring_time ?? "09:30").slice(0, 5);
        const isDayDue = recurringDays.includes(istDayOfWeek);
        const isTimeDue = istTimeStr >= targetTime;

        let alreadyRanToday = false;
        if (rule.last_run_at) {
          const lastRunDateStr = new Date(rule.last_run_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
          alreadyRanToday = lastRunDateStr === istDateStr;
        }

        if (isDayDue && isTimeDue && !alreadyRanToday) {
          const res = await executeLeadAllocation({
            lead_count: rule.lead_count ?? 10,
            conditions: rule.conditions ?? {},
            assignee_ids: rule.assignee_ids ?? [],
            target_list_id: rule.target_list_id,
            notes: `Daily recurring release (${targetTime} IST)`,
            allocation_type: "daily_recurring",
          });

          await supabase()
            .from("lead_allocation_schedules")
            .update({
              allocated_lead_ids: res.leadIds,
              last_run_at: nowIso,
            })
            .eq("id", rule.id);

          executed++;
        }
      }
    }

    // 3. Process queue auto-refills check
    await processQueueAutoRefills();

    return { executedCount: executed };
  } catch (err) {
    console.error("processScheduledJobs error:", err);
    return { executedCount: 0 };
  }
}

/**
 * Selectively recycle and reassign non-positive / unbooked leads from a source list or staff member
 * to one or more target telecallers, cleanly moving them and optionally resetting status to "new".
 */
export async function recycleAndReassignLeads(
  req: RecycleLeadsRequest,
): Promise<RecycleLeadsResult> {
  const targetStaffIds = req.target_admin_user_ids ?? [];
  if (!req.target_list_id && targetStaffIds.length === 0) {
    throw new Error("Please select at least one target telecaller or destination list.");
  }

  // 1. Gather all candidate lead items from the source
  let listItemsQuery = supabase()
    .from("lead_list_items")
    .select(`
      list_id,
      lead_id,
      leads:lead_id (id, status, name)
    `);

  if (req.source_list_id) {
    listItemsQuery = listItemsQuery.eq("list_id", req.source_list_id);
  } else if (req.source_admin_user_id) {
    const { data: sourceLists } = await supabase()
      .from("lead_lists")
      .select("id")
      .eq("assigned_admin_user_id", req.source_admin_user_id);
    const sourceListIds = (sourceLists ?? []).map((l) => l.id);
    if (sourceListIds.length === 0) {
      return { recycledCount: 0, assignedStaffCount: 0, createdListIds: [], protectedCount: 0 };
    }
    listItemsQuery = listItemsQuery.in("list_id", sourceListIds);
  } else {
    throw new Error("Source list or source staff member is required.");
  }

  listItemsQuery = listItemsQuery.range(0, 49999);
  const { data: rawItems, error: itemsErr } = await listItemsQuery;
  if (itemsErr) throw itemsErr;

  const allowedStatuses = new Set(req.include_statuses ?? ["call_not_responded", "contacted", "cancelled", "draft"]);
  const specificIdsSet = req.specific_lead_ids && req.specific_lead_ids.length > 0
    ? new Set(req.specific_lead_ids)
    : null;

  const leadsToRecycle: { leadId: string; sourceListId: string }[] = [];
  let protectedCount = 0;

  for (const item of rawItems ?? []) {
    const lead: any = Array.isArray(item.leads) ? item.leads[0] : item.leads;
    if (!lead) continue;

    const status = lead.status ?? "new";
    const matchesSpecific = !specificIdsSet || specificIdsSet.has(lead.id);

    if (allowedStatuses.has(status) && matchesSpecific) {
      leadsToRecycle.push({ leadId: lead.id, sourceListId: item.list_id });
    } else {
      protectedCount++;
    }
  }

  if (leadsToRecycle.length === 0) {
    return { recycledCount: 0, assignedStaffCount: 0, createdListIds: [], protectedCount };
  }

  const leadIdsToMove = Array.from(new Set(leadsToRecycle.map((l) => l.leadId)));

  // 2. If reset_status_to_new is true, update status in leads table
  if (req.reset_status_to_new) {
    const { error: updateStatusErr } = await supabase()
      .from("leads")
      .update({ status: "new" })
      .in("id", leadIdsToMove);
    if (updateStatusErr) throw updateStatusErr;
  }

  // 3. Remove these leads from their source lists using batch delete
  const leadsBySourceList: Record<string, string[]> = {};
  for (const item of leadsToRecycle) {
    if (!leadsBySourceList[item.sourceListId]) {
      leadsBySourceList[item.sourceListId] = [];
    }
    leadsBySourceList[item.sourceListId].push(item.leadId);
  }

  for (const [sourceListId, ids] of Object.entries(leadsBySourceList)) {
    const { error: delErr } = await supabase()
      .from("lead_list_items")
      .delete()
      .eq("list_id", sourceListId)
      .in("lead_id", ids);
    if (delErr) {
      console.error("Error removing recycled leads from source list:", delErr);
    }
  }

  const createdListIds: string[] = [];

  // 4. Assign to target(s)
  if (req.target_list_id) {
    await addLeadsToList(req.target_list_id, leadIdsToMove);
  } else if (targetStaffIds.length > 0) {
    const perStaff = Math.ceil(leadIdsToMove.length / targetStaffIds.length);
    const dateStr = new Date().toLocaleDateString("en-IN");

    for (let i = 0; i < targetStaffIds.length; i++) {
      const staffId = targetStaffIds[i];
      const slice = leadIdsToMove.slice(i * perStaff, (i + 1) * perStaff);
      if (slice.length === 0) continue;

      const listName = req.create_new_list_name
        ? `${req.create_new_list_name}${targetStaffIds.length > 1 ? ` (Part ${i + 1})` : ""}`
        : `Recycled Leads (${dateStr})`;

      const newList = await insertLeadList({
        name: listName,
        assigned_admin_user_id: staffId,
      });

      await addLeadsToList(newList.id, slice);
      createdListIds.push(newList.id);

      // Log allocation audit using standard manual allocation_type with recycling reason
      const logRows = slice.map((leadId) => ({
        lead_id: leadId,
        assigned_to_admin_user_id: staffId,
        assigned_to_list_id: newList.id,
        allocation_type: "manual" as const,
        reason: req.reason || "Selective lead recycling / 2nd attempt pitch",
      }));
      await supabase().from("lead_allocations_log").insert(logRows);
    }
  }

  return {
    recycledCount: leadIdsToMove.length,
    assignedStaffCount: targetStaffIds.length || 1,
    createdListIds,
    protectedCount,
  };
}

/**
 * Fetch the persistent campaign list membership and allocation history for a specific lead.
 */
export async function getLeadAllocationHistory(leadId: string): Promise<
  {
    id: string;
    created_at: string;
    allocation_type: string;
    reason: string;
    staffName: string | null;
    staffEmail: string | null;
    listName: string | null;
    listId: string | null;
  }[]
> {
  try {
    const { data, error } = await supabase()
      .from("lead_allocations_log")
      .select(`
        id,
        created_at,
        allocation_type,
        reason,
        assigned_to_list_id,
        lead_lists:assigned_to_list_id (id, name),
        admin_users:assigned_to_admin_user_id (id, email, employees:employee_id (name))
      `)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((row: any) => {
      const admin = row.admin_users;
      const emp = admin?.employees;
      const empName = Array.isArray(emp) ? emp[0]?.name : emp?.name;
      const staffName = empName || (admin?.email ? admin.email.split("@")[0] : null);
      const list = row.lead_lists;
      const listName = Array.isArray(list) ? list[0]?.name : list?.name;

      return {
        id: row.id,
        created_at: row.created_at,
        allocation_type: row.allocation_type ?? "manual",
        reason: row.reason || "Assigned to list",
        staffName: staffName ?? null,
        staffEmail: admin?.email ?? null,
        listName: listName ?? null,
        listId: row.assigned_to_list_id ?? null,
      };
    });
  } catch (err) {
    console.error("getLeadAllocationHistory error:", err);
    return [];
  }
}



