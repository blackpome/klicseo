"use server";

import { requirePermission, resolveScope } from "@/lib/admin-auth";
import { getDailyStaffReport, getStaffTimeline, getStaffTimelineForDate } from "@/lib/reports";
import type {
  DailyReportFilter,
  DailyReportSummary,
  StaffTimelineEvent,
} from "@/lib/reports-shared";

export async function fetchDailyReportAction(
  filter: DailyReportFilter,
): Promise<{ ok: boolean; summary?: DailyReportSummary; error?: string }> {
  try {
    const me = await requirePermission("leads.view");
    const scope = (await resolveScope(me)) ?? { kind: "all" as const };

    const effectiveFilter: DailyReportFilter = { ...filter };
    if (scope.kind === "assigned") {
      // Force staff to only see their own assigned stats
      effectiveFilter.assignedAdminUserId = scope.adminUserId;
    }

    const summary = await getDailyStaffReport(effectiveFilter);
    return { ok: true, summary };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to load report data." };
  }
}

export async function fetchStaffTimelineAction(
  email: string,
  optionsOrDate: string | { date?: string; startDate?: string; endDate?: string; isAllTime?: boolean },
): Promise<{ ok: boolean; events?: StaffTimelineEvent[]; error?: string }> {
  try {
    const me = await requirePermission("leads.view");
    const scope = (await resolveScope(me)) ?? { kind: "all" as const };

    if (scope.kind === "assigned") {
      // Staff can ONLY view their own timeline
      if (email.toLowerCase() !== me.email.toLowerCase()) {
        throw new Error("Forbidden: You can only view your own timeline activity.");
      }
    }

    const timelineOptions =
      typeof optionsOrDate === "string" ? { date: optionsOrDate } : optionsOrDate;

    const events = await getStaffTimeline(email, timelineOptions);
    return { ok: true, events };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to load staff timeline." };
  }
}
