"use server";

import { requirePermission } from "@/lib/admin-auth";
import { getDailyStaffReport, getStaffTimelineForDate } from "@/lib/reports";
import type {
  DailyReportFilter,
  DailyReportSummary,
  StaffTimelineEvent,
} from "@/lib/reports-shared";

export async function fetchDailyReportAction(
  filter: DailyReportFilter,
): Promise<{ ok: boolean; summary?: DailyReportSummary; error?: string }> {
  try {
    await requirePermission("leads.view");
    const summary = await getDailyStaffReport(filter);
    return { ok: true, summary };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to load report data." };
  }
}

export async function fetchStaffTimelineAction(
  email: string,
  date: string,
): Promise<{ ok: boolean; events?: StaffTimelineEvent[]; error?: string }> {
  try {
    await requirePermission("leads.view");
    const events = await getStaffTimelineForDate(email, date);
    return { ok: true, events };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to load staff timeline." };
  }
}
