import "server-only";
import { supabase } from "./supabase";
import { getOrBuildLocationIndex } from "./area";
import { listAdminUsers } from "./admin-users";
import { isWebsiteFormLead, isHotLead, isYearLead } from "./leads-shared";
import type {
  AnalyticsFilterOptions,
  AnalyticsReportData,
  AreaStatusMetric,
  StaffAnalyticsMetric,
  YearCohortMetric,
  ExecutiveAnalyticsSummary,
  YearStatusCount,
} from "./analytics-shared";

interface AnalyticsCacheEntry {
  data: AnalyticsReportData;
  expires: number;
}

const analyticsReportCache = new Map<string, AnalyticsCacheEntry>();

export function invalidateAnalyticsCache(): void {
  analyticsReportCache.clear();
}

export async function getAnalyticsReportData(
  filters: AnalyticsFilterOptions = {},
): Promise<AnalyticsReportData> {
  const cacheKey = JSON.stringify(filters);
  const now = Date.now();
  const cached = analyticsReportCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  let listsQuery = supabase()
    .from("lead_lists")
    .select("id, name, assigned_admin_user_id, admin_users(id, email, employees(name)), lead_list_items(lead_id)")
    .order("created_at", { ascending: false });

  if (filters.assignedAdminUserId && filters.assignedAdminUserId !== "all") {
    listsQuery = listsQuery.eq("assigned_admin_user_id", filters.assignedAdminUserId);
  }

  const [locationIndex, adminUsersRes, leadListsRes] = await Promise.all([
    getOrBuildLocationIndex(),
    listAdminUsers().catch(() => []),
    listsQuery,
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
    if (isYearLead(lead)) {
      const yr = lead.year || (lead.created_at ? new Date(lead.created_at).getFullYear().toString() : "2026");
      yearSet.add(yr);
    }
    if (lead.primaryLocality && lead.primaryLocality !== "Unknown" && lead.primaryLocality !== "Unspecified") {
      areaSet.add(lead.primaryLocality);
    }
  }

  const availableYears = Array.from(yearSet).sort((a, b) => b.localeCompare(a));
  const availableAreas = Array.from(areaSet).sort((a, b) => a.localeCompare(b));
  const availableStaff = Array.from(staffLookup.values())
    .map((s) => ({ id: s.id, name: s.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // 2. Filter leads based on user filter selections
  const selectedYear =
    filters.folder && filters.folder.startsWith("year_")
      ? filters.folder.replace("year_", "")
      : filters.year && filters.year !== "all"
      ? filters.year
      : "all";

  const selectedArea = filters.area && filters.area !== "all" ? filters.area.trim().toLowerCase() : "all";
  const selectedStaffId = filters.assignedAdminUserId && filters.assignedAdminUserId !== "all" ? filters.assignedAdminUserId : "all";
  const selectedService = filters.service && filters.service !== "all" ? filters.service : "all";

  let customFolderLeadIds: Set<string> | null = null;
  if (filters.folder && filters.folder.match(/^[0-9a-fA-F-]{36}$/)) {
    const list = leadLists.find((l: any) => l.id === filters.folder);
    if (list) {
      customFolderLeadIds = new Set((list.lead_list_items ?? []).map((i: any) => i.lead_id));
    }
  }

  const filteredLeads = allLeads.filter((lead) => {
    // Custom folder check
    if (customFolderLeadIds && !customFolderLeadIds.has(lead.id)) return false;

    // Folder / Source check
    if (filters.folder === "all_master" || filters.folder === "all") {
      // Show all
    } else if (filters.folder === "website_form" || filters.source === "wizard") {
      if (!isWebsiteFormLead(lead)) return false;
    } else if (filters.folder === "hot_leads" || filters.source === "admin") {
      if (!isHotLead(lead)) return false;
    }

    // Year check
    if (selectedYear !== "all") {
      if (!isYearLead(lead, selectedYear)) return false;
    }

    // Area check
    if (selectedArea !== "all" && lead.primaryLocality.toLowerCase() !== selectedArea) return false;

    // Service check
    if (selectedService !== "all" && lead.service !== selectedService) return false;

    // Staff assignment check
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
    if (!isYearLead(lead)) continue; // Only historical/bulk-uploaded year cohort leads
    const yr = lead.year || (lead.created_at ? new Date(lead.created_at).getFullYear().toString() : "2026");
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

  const result = {
    summary,
    areaMetrics,
    staffMetrics,
    yearCohorts,
    availableYears,
    availableAreas,
    availableStaff,
  };

  analyticsReportCache.set(cacheKey, { data: result, expires: now + 30_000 });
  return result;
}

export async function getAreaTerritoryAnalytics(
  area: string,
  year?: string,
  assignedAdminUserId?: string,
): Promise<import("./analytics-shared").AreaTerritoryAnalyticsData> {
  const index = await getOrBuildLocationIndex();
  const allLeads = index.allLeads;
  const targetNormArea = area.trim().toLowerCase();
  const targetYear = year && year !== "all" ? year.trim() : null;

  // Filter leads matching area across all years for historical comparison
  const areaAllYearsLeads = allLeads.filter(
    (l) => l.primaryLocality && l.primaryLocality.toLowerCase() === targetNormArea,
  );

  // Leads matching area AND active year
  const activeCohortLeads = areaAllYearsLeads.filter(
    (l) => !targetYear || l.year === targetYear,
  );

  // Check allocated leads from lead_list_items
  const { data: listItems } = await supabase()
    .from("lead_list_items")
    .select("lead_id");
  const assignedSet = new Set((listItems ?? []).map((i) => i.lead_id));

  // Query details for car brands
  const leadIds = activeCohortLeads.map((l) => l.id);
  const brandCounts = new Map<string, number>();

  if (leadIds.length > 0) {
    const chunks: string[][] = [];
    for (let i = 0; i < leadIds.length; i += 500) {
      chunks.push(leadIds.slice(i, i + 500));
    }
    const brandResults = await Promise.all(
      chunks.map((ids) =>
        supabase()
          .from("leads")
          .select("car_brand, custom_fields")
          .in("id", ids),
      ),
    );
    for (const res of brandResults) {
      for (const row of res.data ?? []) {
        let brand = row.car_brand;
        if (!brand && row.custom_fields) {
          brand =
            row.custom_fields["Vehicle Maker"] ||
            row.custom_fields["Maker"] ||
            row.custom_fields["car_brand"] ||
            null;
        }
        if (brand) {
          const cleanBrand = String(brand)
            .replace(/\b(PVT|LTD|INDIA|MOTORS|MOTOR)\b/gi, "")
            .trim();
          if (cleanBrand) {
            brandCounts.set(cleanBrand, (brandCounts.get(cleanBrand) ?? 0) + 1);
          }
        }
      }
    }
  }

  // Status breakdown
  const statusBreakdown: Record<string, number> = {};
  let bookedCount = 0;
  let contactedCount = 0;
  let followUpCount = 0;
  let newCount = 0;
  let lostCount = 0;
  let estimatedRevenue = 0;
  let allocatedCount = 0;
  const serviceCounts = new Map<string, number>();

  for (const lead of activeCohortLeads) {
    const st = lead.status ?? "new";
    statusBreakdown[st] = (statusBreakdown[st] ?? 0) + 1;

    if (st === "booked") {
      bookedCount++;
      estimatedRevenue += lead.price_total ?? 0;
    } else if (st === "contacted") {
      contactedCount++;
    } else if (st === "follow_up") {
      followUpCount++;
    } else if (st === "call_not_responded" || st === "cancelled" || st === "lost" || st === "not_interested") {
      lostCount++;
    } else {
      newCount++;
    }

    if (assignedSet.has(lead.id)) {
      allocatedCount++;
    }

    if (lead.service) {
      serviceCounts.set(lead.service, (serviceCounts.get(lead.service) ?? 0) + 1);
    }
  }

  const totalLeads = activeCohortLeads.length;
  const unallocatedCount = Math.max(0, totalLeads - allocatedCount);
  const conversionRate = totalLeads > 0 ? Math.round((bookedCount / totalLeads) * 100) : 0;
  const allocationRate = totalLeads > 0 ? Math.round((allocatedCount / totalLeads) * 100) : 0;

  // Top Car Brands
  const topCarBrands = [...brandCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([brand, count]) => ({
      brand,
      count,
      percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
    }));

  // Top Services
  const topServices = [...serviceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([service, count]) => ({
      service,
      count,
      percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
    }));

  // Year comparison
  const yearMap = new Map<string, { count: number; bookedCount: number }>();
  for (const lead of areaAllYearsLeads) {
    const yr = lead.year || "2026";
    if (!yearMap.has(yr)) {
      yearMap.set(yr, { count: 0, bookedCount: 0 });
    }
    const stat = yearMap.get(yr)!;
    stat.count++;
    if (lead.status === "booked") stat.bookedCount++;
  }

  const yearComparison = [...yearMap.entries()]
    .map(([yr, stat]) => ({ year: yr, count: stat.count, bookedCount: stat.bookedCount }))
    .sort((a, b) => b.year.localeCompare(a.year));

  return {
    area,
    year: targetYear || "All Years",
    totalLeads,
    statusBreakdown,
    bookedCount,
    contactedCount,
    followUpCount,
    newCount,
    lostCount,
    conversionRate,
    allocatedCount,
    unallocatedCount,
    allocationRate,
    estimatedRevenue,
    topServices,
    topCarBrands,
    yearComparison,
  };
}
