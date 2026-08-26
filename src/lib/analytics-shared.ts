export interface AnalyticsFilterOptions {
  year?: string; // "all" | "2026" | "2025" | "2024" | ...
  area?: string; // "all" | specific locality name
  assignedAdminUserId?: string; // "all" | specific staff ID
  service?: string;
}

export interface YearStatusCount {
  year: string;
  total: number;
  booked: number;
  followUp: number;
  contacted: number;
  callNotResponded: number;
  new: number;
  cancelled: number;
  conversionRate: number;
}

export interface AreaStatusMetric {
  area: string;
  total: number;
  booked: number;
  followUp: number;
  contacted: number;
  callNotResponded: number;
  new: number;
  cancelled: number;
  draft: number;
  conversionRate: number;
  estimatedRevenue: number;
  yearBreakdown: Record<string, YearStatusCount>;
  assignedStaffBreakdown: Array<{
    staffName: string;
    staffId: string;
    total: number;
    booked: number;
    followUp: number;
  }>;
}

export interface StaffAreaAttribution {
  area: string;
  total: number;
  booked: number;
  followUp: number;
  conversionRate: number;
}

export interface StaffAnalyticsMetric {
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
  conversionRate: number;
  estimatedRevenue: number;
  topAreas: StaffAreaAttribution[];
  yearBreakdown: Record<string, { total: number; booked: number; followUp: number; conversionRate: number }>;
}

export interface YearCohortMetric {
  year: string;
  totalLeads: number;
  bookedCount: number;
  followUpCount: number;
  conversionRate: number;
  topAreaName: string;
  topAreaBooked: number;
}

export interface ExecutiveAnalyticsSummary {
  totalLeads: number;
  totalBooked: number;
  totalFollowUp: number;
  totalContacted: number;
  totalNotResponded: number;
  totalNew: number;
  totalCancelled: number;
  conversionRate: number;
  estimatedRevenue: number;
  topArea: { name: string; booked: number; conversionRate: number } | null;
  topStaff: { name: string; booked: number; conversionRate: number } | null;
  selectedYear: string;
}

export interface AnalyticsReportData {
  summary: ExecutiveAnalyticsSummary;
  areaMetrics: AreaStatusMetric[];
  staffMetrics: StaffAnalyticsMetric[];
  yearCohorts: YearCohortMetric[];
  availableYears: string[];
  availableAreas: string[];
  availableStaff: Array<{ id: string; name: string }>;
}

export interface AreaTerritoryAnalyticsData {
  area: string;
  year: string;
  totalLeads: number;
  statusBreakdown: Record<string, number>;
  bookedCount: number;
  contactedCount: number;
  followUpCount: number;
  newCount: number;
  lostCount: number;
  conversionRate: number;
  allocatedCount: number;
  unallocatedCount: number;
  allocationRate: number;
  estimatedRevenue: number;
  topServices: Array<{ service: string; count: number; percentage: number }>;
  topCarBrands: Array<{ brand: string; count: number; percentage: number }>;
  yearComparison: Array<{ year: string; count: number; bookedCount: number }>;
}
