import "server-only";
import { supabase } from "./supabase";
import { getOrBuildLocationIndex } from "./area";
import { listAdminUsers } from "./admin-users";
import type {
  AnalyticsFilterOptions,
  AnalyticsReportData,
  AreaStatusMetric,
  StaffAnalyticsMetric,
  YearCohortMetric,
  ExecutiveAnalyticsSummary,
  YearStatusCount,
} from "./analytics-shared";

export async function getAnalyticsReportData(
  filters: AnalyticsFilterOptions = {},
): Promise<AnalyticsReportData> {
  const [locationIndex, adminUsersRes, leadListsRes] = await Promise.all([
    getOrBuildLocationIndex(),
    listAdminUsers().catch(() => []),
    supabase()
      .from("lead_lists")
      .select("id, name, assigned_admin_user_id, admin_users(id, email, employees(name)), lead_list_items(lead_id)")
      .order("created_at", { ascending: false }),
  ]);

  const allLeads = locationIndex.allLeads;
  const leadLists = leadListsRes.data ?? [];

  // Map: lead_id -> { staffId: string, staffName: string }
  const leadToStaffMap = new Map<string, { staffId: string; staffName: string }>();
  const staffLookup = new Map<string, { id: string; name: string; email: string }>();

  for (const user of adminUsersRes) {
    staffLookup.set(user.id, {
      id: user.id,
      name: user.employees?.name || user.email.split("@")[0],
      email: user.email,
    });
  }

  for (const list of leadLists) {
    const assignedId = list.assigned_admin_user_id;
    if (!assignedId) continue;

    const staffInfo = staffLookup.get(assignedId) || {
      id: assignedId,
      name: (list.admin_users as any)?.employees?.name || (list.admin_users as any)?.email?.split("@")[0] || "Unknown",
      email: (list.admin_users as any)?.email || "",
    };

    for (const item of (list.lead_list_items ?? []) as Array<{ lead_id: string }>) {
      if (!leadToStaffMap.has(item.lead_id)) {
        leadToStaffMap.set(item.lead_id, { staffId: staffInfo.id, staffName: staffInfo.name });
      }
    }
  }

  // 1. Collect all available years and areas
  const yearSet = new Set<string>();
  const areaSet = new Set<string>();

  for (const lead of allLeads) {
    const yr = lead.year || "2026";
    yearSet.add(yr);
    if (lead.primaryLocality && lead.primaryLocality !== "Unknown") {
      areaSet.add(lead.primaryLocality);
    }
  }

  const availableYears = Array.from(yearSet).sort((a, b) => b.localeCompare(a));
  const availableAreas = Array.from(areaSet).sort((a, b) => a.localeCompare(b));
  const availableStaff = Array.from(staffLookup.values())
    .map((s) => ({ id: s.id, name: s.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // 2. Filter leads based on user filter selections
  const selectedYear = filters.year && filters.year !== "all" ? filters.year : "all";
  const selectedArea = filters.area && filters.area !== "all" ? filters.area.trim().toLowerCase() : "all";
  const selectedStaffId = filters.assignedAdminUserId && filters.assignedAdminUserId !== "all" ? filters.assignedAdminUserId : "all";
  const selectedService = filters.service && filters.service !== "all" ? filters.service : "all";

  const filteredLeads = allLeads.filter((lead) => {
    if (selectedYear !== "all" && lead.year !== selectedYear) return false;
    if (selectedArea !== "all" && lead.primaryLocality.toLowerCase() !== selectedArea) return false;
    if (selectedService !== "all" && lead.service !== selectedService) return false;
    if (selectedStaffId !== "all") {
      const assigned = leadToStaffMap.get(lead.id);
      if (!assigned || assigned.staffId !== selectedStaffId) return false;
    }
    return true;
  });

  // 3. Aggregate Area x Year x Status Metrics
  const areaMetricsMap = new Map<string, {
    area: string;
    total: number;
    booked: number;
    followUp: number;
    contacted: number;
    callNotResponded: number;
    new: number;
    cancelled: number;
    draft: number;
    estimatedRevenue: number;
    yearMap: Map<string, YearStatusCount>;
    staffMap: Map<string, { staffName: string; staffId: string; total: number; booked: number; followUp: number }>;
  }>();

  for (const lead of filteredLeads) {
    const areaName = lead.primaryLocality || "Unspecified";
    if (!areaMetricsMap.has(areaName)) {
      areaMetricsMap.set(areaName, {
        area: areaName,
        total: 0,
        booked: 0,
        followUp: 0,
        contacted: 0,
        callNotResponded: 0,
        new: 0,
        cancelled: 0,
        draft: 0,
        estimatedRevenue: 0,
        yearMap: new Map(),
        staffMap: new Map(),
      });
    }

    const aStat = areaMetricsMap.get(areaName)!;
    aStat.total++;

    const st = lead.status ?? "new";
    if (st === "booked") {
      aStat.booked++;
      aStat.estimatedRevenue += lead.price_total ?? 0;
    } else if (st === "follow_up") {
      aStat.followUp++;
    } else if (st === "contacted") {
      aStat.contacted++;
    } else if (st === "call_not_responded") {
      aStat.callNotResponded++;
    } else if (st === "cancelled") {
      aStat.cancelled++;
    } else if (st === "draft") {
      aStat.draft++;
    } else {
      aStat.new++;
    }

    // Year breakdown for this area
    const yr = lead.year || "2026";
    if (!aStat.yearMap.has(yr)) {
      aStat.yearMap.set(yr, {
        year: yr,
        total: 0,
        booked: 0,
        followUp: 0,
        contacted: 0,
        callNotResponded: 0,
        new: 0,
        cancelled: 0,
        conversionRate: 0,
      });
    }
    const yStat = aStat.yearMap.get(yr)!;
    yStat.total++;
    if (st === "booked") yStat.booked++;
    else if (st === "follow_up") yStat.followUp++;
    else if (st === "contacted") yStat.contacted++;
    else if (st === "call_not_responded") yStat.callNotResponded++;
    else if (st === "cancelled") yStat.cancelled++;
    else if (st === "new") yStat.new++;

    // Staff breakdown for this area
    const assigned = leadToStaffMap.get(lead.id);
    if (assigned) {
      if (!aStat.staffMap.has(assigned.staffId)) {
        aStat.staffMap.set(assigned.staffId, {
          staffName: assigned.staffName,
          staffId: assigned.staffId,
          total: 0,
          booked: 0,
          followUp: 0,
        });
      }
      const sStat = aStat.staffMap.get(assigned.staffId)!;
      sStat.total++;
      if (st === "booked") sStat.booked++;
      else if (st === "follow_up") sStat.followUp++;
    }
  }

  const areaMetrics: AreaStatusMetric[] = Array.from(areaMetricsMap.values())
    .map((a) => {
      const yearBreakdown: Record<string, YearStatusCount> = {};
      for (const [yr, yStat] of a.yearMap.entries()) {
        yearBreakdown[yr] = {
          ...yStat,
          conversionRate: yStat.total > 0 ? Math.round((yStat.booked / yStat.total) * 1000) / 10 : 0,
        };
      }

      const assignedStaffBreakdown = Array.from(a.staffMap.values()).sort(
        (x, y) => y.booked - x.booked || y.total - x.total,
      );

      return {
        area: a.area,
        total: a.total,
        booked: a.booked,
        followUp: a.followUp,
        contacted: a.contacted,
        callNotResponded: a.callNotResponded,
        new: a.new,
        cancelled: a.cancelled,
        draft: a.draft,
        conversionRate: a.total > 0 ? Math.round((a.booked / a.total) * 1000) / 10 : 0,
        estimatedRevenue: a.estimatedRevenue,
        yearBreakdown,
        assignedStaffBreakdown,
      };
    })
    .sort((a, b) => b.booked - a.booked || b.total - a.total);

  // 4. Aggregate Staff Performance & Area Attribution
  const staffMetricsMap = new Map<string, {
    adminUserId: string;
    staffName: string;
    email: string;
    totalAssigned: number;
    bookedCount: number;
    followUpCount: number;
    contactedCount: number;
    notRespondedCount: number;
    newCount: number;
    cancelledCount: number;
    estimatedRevenue: number;
    areaMap: Map<string, { total: number; booked: number; followUp: number }>;
    yearMap: Map<string, { total: number; booked: number; followUp: number }>;
  }>();

  // Initialize for all active staff
  for (const staff of staffLookup.values()) {
    staffMetricsMap.set(staff.id, {
      adminUserId: staff.id,
      staffName: staff.name,
      email: staff.email,
      totalAssigned: 0,
      bookedCount: 0,
      followUpCount: 0,
      contactedCount: 0,
      notRespondedCount: 0,
      newCount: 0,
      cancelledCount: 0,
      estimatedRevenue: 0,
      areaMap: new Map(),
      yearMap: new Map(),
    });
  }

  for (const lead of filteredLeads) {
    const assigned = leadToStaffMap.get(lead.id);
    if (!assigned) continue;

    if (!staffMetricsMap.has(assigned.staffId)) {
      staffMetricsMap.set(assigned.staffId, {
        adminUserId: assigned.staffId,
        staffName: assigned.staffName,
        email: "",
        totalAssigned: 0,
        bookedCount: 0,
        followUpCount: 0,
        contactedCount: 0,
        notRespondedCount: 0,
        newCount: 0,
        cancelledCount: 0,
        estimatedRevenue: 0,
        areaMap: new Map(),
        yearMap: new Map(),
      });
    }

    const sm = staffMetricsMap.get(assigned.staffId)!;
    sm.totalAssigned++;

    const st = lead.status ?? "new";
    if (st === "booked") {
      sm.bookedCount++;
      sm.estimatedRevenue += lead.price_total ?? 0;
    } else if (st === "follow_up") {
      sm.followUpCount++;
    } else if (st === "contacted") {
      sm.contactedCount++;
    } else if (st === "call_not_responded") {
      sm.notRespondedCount++;
    } else if (st === "cancelled") {
      sm.cancelledCount++;
    } else {
      sm.newCount++;
    }

    // Area attribution for staff
    const areaName = lead.primaryLocality || "Unspecified";
    if (!sm.areaMap.has(areaName)) {
      sm.areaMap.set(areaName, { total: 0, booked: 0, followUp: 0 });
    }
    const aStat = sm.areaMap.get(areaName)!;
    aStat.total++;
    if (st === "booked") aStat.booked++;
    else if (st === "follow_up") aStat.followUp++;

    // Year cohort for staff
    const yr = lead.year || "2026";
    if (!sm.yearMap.has(yr)) {
      sm.yearMap.set(yr, { total: 0, booked: 0, followUp: 0 });
    }
    const yStat = sm.yearMap.get(yr)!;
    yStat.total++;
    if (st === "booked") yStat.booked++;
    else if (st === "follow_up") yStat.followUp++;
  }

  const staffMetrics: StaffAnalyticsMetric[] = Array.from(staffMetricsMap.values())
    .map((sm) => {
      const topAreas = Array.from(sm.areaMap.entries())
        .map(([area, stat]) => ({
          area,
          total: stat.total,
          booked: stat.booked,
          followUp: stat.followUp,
          conversionRate: stat.total > 0 ? Math.round((stat.booked / stat.total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.booked - a.booked || b.total - a.total);

      const yearBreakdown: Record<string, { total: number; booked: number; followUp: number; conversionRate: number }> = {};
      for (const [yr, stat] of sm.yearMap.entries()) {
        yearBreakdown[yr] = {
          ...stat,
          conversionRate: stat.total > 0 ? Math.round((stat.booked / stat.total) * 1000) / 10 : 0,
        };
      }

      return {
        adminUserId: sm.adminUserId,
        staffName: sm.staffName,
        email: sm.email,
        totalAssigned: sm.totalAssigned,
        bookedCount: sm.bookedCount,
        followUpCount: sm.followUpCount,
        contactedCount: sm.contactedCount,
        notRespondedCount: sm.notRespondedCount,
        newCount: sm.newCount,
        cancelledCount: sm.cancelledCount,
        conversionRate: sm.totalAssigned > 0 ? Math.round((sm.bookedCount / sm.totalAssigned) * 1000) / 10 : 0,
        estimatedRevenue: sm.estimatedRevenue,
        topAreas,
        yearBreakdown,
      };
    })
    .filter((sm) => sm.totalAssigned > 0 || staffLookup.has(sm.adminUserId))
    .sort((a, b) => b.bookedCount - a.bookedCount || b.totalAssigned - a.totalAssigned);

  // 5. Year Cohorts Summary
  const yearCohortsMap = new Map<string, { total: number; booked: number; followUp: number; areaCounts: Map<string, number> }>();
  for (const yr of availableYears) {
    yearCohortsMap.set(yr, { total: 0, booked: 0, followUp: 0, areaCounts: new Map() });
  }

  for (const lead of allLeads) {
    const yr = lead.year || "2026";
    if (!yearCohortsMap.has(yr)) {
      yearCohortsMap.set(yr, { total: 0, booked: 0, followUp: 0, areaCounts: new Map() });
    }
    const yc = yearCohortsMap.get(yr)!;
    yc.total++;
    if (lead.status === "booked") {
      yc.booked++;
      const a = lead.primaryLocality || "Unspecified";
      yc.areaCounts.set(a, (yc.areaCounts.get(a) ?? 0) + 1);
    } else if (lead.status === "follow_up") {
      yc.followUp++;
    }
  }

  const yearCohorts: YearCohortMetric[] = availableYears.map((yr) => {
    const yc = yearCohortsMap.get(yr) ?? { total: 0, booked: 0, followUp: 0, areaCounts: new Map() };
    let topAreaName = "None";
    let topAreaBooked = 0;
    for (const [aName, count] of yc.areaCounts.entries()) {
      if (count > topAreaBooked) {
        topAreaBooked = count;
        topAreaName = aName;
      }
    }
    return {
      year: yr,
      totalLeads: yc.total,
      bookedCount: yc.booked,
      followUpCount: yc.followUp,
      conversionRate: yc.total > 0 ? Math.round((yc.booked / yc.total) * 1000) / 10 : 0,
      topAreaName,
      topAreaBooked,
    };
  });

  // 6. Overall Executive Summary
  let totalBooked = 0;
  let totalFollowUp = 0;
  let totalContacted = 0;
  let totalCNR = 0;
  let totalNew = 0;
  let totalCancelled = 0;
  let estimatedRevenue = 0;

  for (const lead of filteredLeads) {
    const st = lead.status ?? "new";
    if (st === "booked") {
      totalBooked++;
      estimatedRevenue += lead.price_total ?? 0;
    } else if (st === "follow_up") {
      totalFollowUp++;
    } else if (st === "contacted") {
      totalContacted++;
    } else if (st === "call_not_responded") {
      totalCNR++;
    } else if (st === "cancelled") {
      totalCancelled++;
    } else {
      totalNew++;
    }
  }

  const topAreaRecord = areaMetrics.find((a) => a.area !== "Unknown" && a.area !== "Unspecified") || areaMetrics[0];
  const topStaffRecord = staffMetrics.find((s) => s.totalAssigned > 0) || staffMetrics[0];

  const summary: ExecutiveAnalyticsSummary = {
    totalLeads: filteredLeads.length,
    totalBooked,
    totalFollowUp,
    totalContacted,
    totalNotResponded: totalCNR,
    totalNew,
    totalCancelled,
    conversionRate: filteredLeads.length > 0 ? Math.round((totalBooked / filteredLeads.length) * 1000) / 10 : 0,
    estimatedRevenue,
    topArea: topAreaRecord ? { name: topAreaRecord.area, booked: topAreaRecord.booked, conversionRate: topAreaRecord.conversionRate } : null,
    topStaff: topStaffRecord ? { name: topStaffRecord.staffName, booked: topStaffRecord.bookedCount, conversionRate: topStaffRecord.conversionRate } : null,
    selectedYear,
  };

  return {
    summary,
    areaMetrics,
    staffMetrics,
    yearCohorts,
    availableYears,
    availableAreas,
    availableStaff,
  };
}
