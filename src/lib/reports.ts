import "server-only";
import { supabase } from "./supabase";
import { listAdminUsers } from "./admin-users";
import { unsealFields } from "./crypto";
import { ENCRYPTED_LEAD_FIELDS, type LeadStatus, type LeadRow } from "./leads";
import type {
  DailyReportFilter,
  DailyReportSummary,
  StaffDailyMetric,
  StaffTimelineEvent,
} from "./reports-shared";

/**
 * Returns today's date in IST formatted as YYYY-MM-DD
 */
export function getTodayIST(): string {
  const now = new Date();
  // Adjust for IST (+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().slice(0, 10);
}

/**
 * Converts an IST date string (YYYY-MM-DD) into UTC ISO range [start, end]
 */
export function istDateToUtcRange(dateStr: string): { startUtc: string; endUtc: string } {
  const [year, month, day] = dateStr.split("-").map((n) => parseInt(n, 10));
  
  // IST 00:00:00 is previous day 18:30:00 UTC
  const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  startDate.setMinutes(startDate.getMinutes() - 330); // minus 5 hrs 30 mins

  // IST 23:59:59.999 is same day 18:29:59.999 UTC
  const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  endDate.setMinutes(endDate.getMinutes() - 330);

  return {
    startUtc: startDate.toISOString(),
    endUtc: endDate.toISOString(),
  };
}

/**
 * Converts an IST date range (start YYYY-MM-DD, end YYYY-MM-DD) into UTC ISO range
 */
export function istRangeToUtcRange(
  startDateStr: string,
  endDateStr: string,
): { startUtc: string; endUtc: string } {
  const start = istDateToUtcRange(startDateStr).startUtc;
  const end = istDateToUtcRange(endDateStr).endUtc;
  return { startUtc: start, endUtc: end };
}

/**
 * Parses the target lead status from an audit log summary or metadata
 */
function extractStatusFromAudit(log: { action: string; summary: string | null; metadata: any }): LeadStatus | null {
  if (log.metadata?.status && typeof log.metadata.status === "string") {
    return log.metadata.status as LeadStatus;
  }
  if (!log.summary) return null;

  const match = log.summary.match(/→\s*([a-zA-Z_]+)/i);
  if (match && match[1]) {
    const raw = match[1].toLowerCase().trim();
    const valid: LeadStatus[] = [
      "new",
      "contacted",
      "follow_up",
      "call_not_responded",
      "booked",
      "cancelled",
      "draft",
    ];
    if (valid.includes(raw as LeadStatus)) {
      return raw as LeadStatus;
    }
  }
  return null;
}

/**
 * Get daily progress report for all staff for a specific date or date range.
 */
export async function getDailyStaffReport(
  filter?: DailyReportFilter,
): Promise<DailyReportSummary> {
  const today = getTodayIST();
  let primaryDate = filter?.date || today;
  let startDate = filter?.startDate || primaryDate;
  let endDate = filter?.endDate || primaryDate;
  const isSingleDay = startDate === endDate;

  // Compute UTC timestamp bounds for query
  const { startUtc, endUtc } = isSingleDay
    ? istDateToUtcRange(primaryDate)
    : istRangeToUtcRange(startDate, endDate);

  // 1. Fetch active staff / admin users
  const adminUsers = await listAdminUsers().catch(() => []);
  const activeStaff = adminUsers.filter((u) => u.status === "active");

  // Map of email → AdminUser
  const staffByEmail = new Map<string, (typeof activeStaff)[0]>();
  for (const s of activeStaff) {
    staffByEmail.set(s.email.toLowerCase(), s);
  }

  // 2. Fetch queue stats (assigned leads & pending uncalled per staff)
  const { data: queueItems } = await supabase()
    .from("lead_list_items")
    .select(`
      list_id,
      lead_id,
      lead_lists!inner(assigned_admin_user_id),
      leads:lead_id (status)
    `);

  const assignedCountByStaff = new Map<string, number>();
  const pendingCountByStaff = new Map<string, number>();

  for (const item of queueItems ?? []) {
    const adminId = (item.lead_lists as any)?.assigned_admin_user_id;
    if (!adminId) continue;

    assignedCountByStaff.set(adminId, (assignedCountByStaff.get(adminId) ?? 0) + 1);

    const lead: any = Array.isArray(item.leads) ? item.leads[0] : item.leads;
    const status = lead?.status ?? "new";
    if (status === "new" || status === "draft") {
      pendingCountByStaff.set(adminId, (pendingCountByStaff.get(adminId) ?? 0) + 1);
    }
  }

  // 3. Fetch audit logs in the date window for lead actions
  const { data: logs, error: logsErr } = await supabase()
    .from("audit_logs")
    .select("id, created_at, actor_email, action, entity, entity_id, summary, metadata")
    .in("action", ["lead.status", "lead.create", "lead.notes", "lead.update"])
    .gte("created_at", startUtc)
    .lte("created_at", endUtc)
    .order("created_at", { ascending: true });

  if (logsErr) {
    console.error("Failed to query audit logs for daily report:", logsErr);
  }

  // 4. Aggregate metrics per staff
  type MetricAccumulator = {
    totalCalls: number;
    bookedCount: number;
    contactedCount: number;
    followUpCount: number;
    notRespondedCount: number;
    cancelledCount: number;
    draftCount: number;
    newCount: number;
  };

  const activityByEmail = new Map<string, MetricAccumulator>();

  for (const log of logs ?? []) {
    if (!log.actor_email) continue;
    const email = log.actor_email.toLowerCase();

    if (!activityByEmail.has(email)) {
      activityByEmail.set(email, {
        totalCalls: 0,
        bookedCount: 0,
        contactedCount: 0,
        followUpCount: 0,
        notRespondedCount: 0,
        cancelledCount: 0,
        draftCount: 0,
        newCount: 0,
      });
    }

    const acc = activityByEmail.get(email)!;

    if (log.action === "lead.status") {
      acc.totalCalls += 1;
      const status = extractStatusFromAudit(log);
      if (status === "booked") acc.bookedCount += 1;
      else if (status === "contacted") acc.contactedCount += 1;
      else if (status === "follow_up") acc.followUpCount += 1;
      else if (status === "call_not_responded") acc.notRespondedCount += 1;
      else if (status === "cancelled") acc.cancelledCount += 1;
      else if (status === "draft") acc.draftCount += 1;
      else if (status === "new") acc.newCount += 1;
    }
  }

  // 5. Build StaffDailyMetric array
  const staffMetrics: StaffDailyMetric[] = [];
  let summaryTotalCalls = 0;
  let summaryTotalBooked = 0;
  let summaryTotalFollowUp = 0;
  let summaryTotalContacted = 0;
  let summaryTotalNotResponded = 0;
  let summaryTotalCancelled = 0;

  for (const staff of activeStaff) {
    const email = staff.email.toLowerCase();
    const act = activityByEmail.get(email) ?? {
      totalCalls: 0,
      bookedCount: 0,
      contactedCount: 0,
      followUpCount: 0,
      notRespondedCount: 0,
      cancelledCount: 0,
      draftCount: 0,
      newCount: 0,
    };

    const connectedCalls =
      act.contactedCount + act.bookedCount + act.followUpCount + act.cancelledCount;

    const connectivityRate =
      act.totalCalls > 0 ? Math.round((connectedCalls / act.totalCalls) * 100) : 0;

    const conversionRate =
      connectedCalls > 0 ? Math.round((act.bookedCount / connectedCalls) * 100) : 0;

    const name = staff.employees?.name || staff.email.split("@")[0];

    staffMetrics.push({
      adminUserId: staff.id,
      email: staff.email,
      name,
      role: staff.role,
      totalCalls: act.totalCalls,
      bookedCount: act.bookedCount,
      contactedCount: act.contactedCount,
      followUpCount: act.followUpCount,
      notRespondedCount: act.notRespondedCount,
      cancelledCount: act.cancelledCount,
      draftCount: act.draftCount,
      newCount: act.newCount,
      connectivityRate,
      conversionRate,
      totalAssignedLeads: assignedCountByStaff.get(staff.id) ?? 0,
      pendingUncalledLeads: pendingCountByStaff.get(staff.id) ?? 0,
      targetCalls: 35, // Daily calling goal benchmark
    });

    summaryTotalCalls += act.totalCalls;
    summaryTotalBooked += act.bookedCount;
    summaryTotalFollowUp += act.followUpCount;
    summaryTotalContacted += act.contactedCount;
    summaryTotalNotResponded += act.notRespondedCount;
    summaryTotalCancelled += act.cancelledCount;
  }

  // Sort staff: most bookings first, then most calls, then highest conversion rate
  staffMetrics.sort((a, b) => {
    if (b.bookedCount !== a.bookedCount) return b.bookedCount - a.bookedCount;
    if (b.totalCalls !== a.totalCalls) return b.totalCalls - a.totalCalls;
    return b.conversionRate - a.conversionRate;
  });

  const totalConnected =
    summaryTotalContacted + summaryTotalBooked + summaryTotalFollowUp + summaryTotalCancelled;

  const overallConnectivityRate =
    summaryTotalCalls > 0 ? Math.round((totalConnected / summaryTotalCalls) * 100) : 0;

  const overallConversionRate =
    totalConnected > 0 ? Math.round((summaryTotalBooked / totalConnected) * 100) : 0;

  const activeStaffCount = staffMetrics.filter((s) => s.totalCalls > 0).length;

  return {
    date: primaryDate,
    startDate,
    endDate,
    isSingleDay,
    totalCalls: summaryTotalCalls,
    totalBookings: summaryTotalBooked,
    totalFollowUps: summaryTotalFollowUp,
    totalContacted: summaryTotalContacted,
    totalNotResponded: summaryTotalNotResponded,
    totalCancelled: summaryTotalCancelled,
    activeStaffCount,
    overallConnectivityRate,
    overallConversionRate,
    staffMetrics,
  };
}

/**
 * Get detailed chronological call timeline of a staff member for a given date.
 */
export async function getStaffTimelineForDate(
  actorEmail: string,
  dateStr: string,
): Promise<StaffTimelineEvent[]> {
  const { startUtc, endUtc } = istDateToUtcRange(dateStr);

  const { data: logs, error } = await supabase()
    .from("audit_logs")
    .select("id, created_at, action, entity, entity_id, summary, metadata")
    .eq("actor_email", actorEmail)
    .gte("created_at", startUtc)
    .lte("created_at", endUtc)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!logs || logs.length === 0) return [];

  // Collect lead ids to fetch contextual lead info
  const leadIds = Array.from(
    new Set(logs.filter((l) => l.entity === "lead" && l.entity_id).map((l) => l.entity_id!)),
  );

  let leadMap = new Map<string, LeadRow>();
  if (leadIds.length > 0) {
    const { data: leadsData } = await supabase()
      .from("leads")
      .select("id, name, phone, area, service")
      .in("id", leadIds);

    for (const raw of leadsData ?? []) {
      const unsealed = unsealFields(raw as LeadRow, ENCRYPTED_LEAD_FIELDS);
      if (unsealed) leadMap.set(unsealed.id, unsealed as LeadRow);
    }
  }

  const events: StaffTimelineEvent[] = logs.map((l) => {
    const lead = l.entity_id ? leadMap.get(l.entity_id) : undefined;
    const statusTo = extractStatusFromAudit(l);

    // Format IST time
    const d = new Date(l.created_at);
    const timeFormatted = d.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return {
      id: l.id,
      timestamp: l.created_at,
      timeFormatted,
      action: l.action,
      leadId: l.entity_id ?? "",
      leadName: lead?.name || null,
      leadPhone: lead?.phone || null,
      leadArea: lead?.area || null,
      leadService: lead?.service || null,
      statusTo,
      summary: l.summary,
      notes: (l.metadata?.notes as string) || null,
    };
  });

  return events;
}
