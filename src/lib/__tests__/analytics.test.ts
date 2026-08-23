import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAnalyticsReportData } from "../analytics";

// Mock area and admin-users
vi.mock("../area", () => ({
  getOrBuildLocationIndex: vi.fn().mockResolvedValue({
    allLeads: [
      {
        id: "l-1",
        primaryLocality: "Puzhuthivakkam",
        pincode: "600091",
        status: "booked",
        source: "admin",
        service: "PPF",
        price_total: 50000,
        year: "2026",
        created_at: "2026-06-25T00:00:00Z",
      },
      {
        id: "l-2",
        primaryLocality: "Puzhuthivakkam",
        pincode: "600091",
        status: "follow_up",
        source: "admin",
        service: "PPF",
        price_total: 50000,
        year: "2025",
        created_at: "2026-06-25T00:00:00Z",
      },
      {
        id: "l-3",
        primaryLocality: "Velachery",
        pincode: "600042",
        status: "booked",
        source: "admin",
        service: "Ceramic",
        price_total: 30000,
        year: "2024",
        created_at: "2026-06-25T00:00:00Z",
      },
      {
        id: "l-4",
        primaryLocality: "Velachery",
        pincode: "600042",
        status: "new",
        source: "wizard",
        service: "Ceramic",
        price_total: 30000,
        year: "2026",
        created_at: "2026-06-25T00:00:00Z",
      },
    ],
    leadMap: new Map(),
    yearToLeadIds: new Map(),
    areaToLeadIds: new Map(),
  }),
}));

vi.mock("../admin-users", () => ({
  listAdminUsers: vi.fn().mockResolvedValue([
    {
      id: "u-1",
      email: "priya@example.com",
      status: "active",
      employees: { name: "Priya" },
    },
  ]),
}));

vi.mock("../supabase", () => ({
  supabase: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: "list-1",
              name: "Puzhuthivakkam Batch",
              assigned_admin_user_id: "u-1",
              admin_users: {
                id: "u-1",
                email: "priya@example.com",
                employees: { name: "Priya" },
              },
              lead_list_items: [{ lead_id: "l-1" }, { lead_id: "l-2" }],
            },
          ],
        }),
      }),
    }),
  }),
}));

describe("Analytics Engine: getAnalyticsReportData", () => {
  it("aggregates data correctly across all years combined", async () => {
    const report = await getAnalyticsReportData({ year: "all" });

    expect(report.summary.totalLeads).toBe(4);
    expect(report.summary.totalBooked).toBe(2);
    expect(report.summary.totalFollowUp).toBe(1);
    expect(report.summary.totalNew).toBe(1);
    expect(report.summary.conversionRate).toBe(50); // 2 out of 4 = 50%

    // Check available years
    expect(report.availableYears).toContain("2026");
    expect(report.availableYears).toContain("2025");
    expect(report.availableYears).toContain("2024");

    // Check Area breakdown
    const puzhuthivakkam = report.areaMetrics.find((a) => a.area === "Puzhuthivakkam");
    expect(puzhuthivakkam).toBeDefined();
    expect(puzhuthivakkam?.total).toBe(2);
    expect(puzhuthivakkam?.booked).toBe(1);
    expect(puzhuthivakkam?.yearBreakdown["2026"]?.booked).toBe(1);
    expect(puzhuthivakkam?.yearBreakdown["2025"]?.followUp).toBe(1);

    // Check Staff Attribution
    const priya = report.staffMetrics.find((s) => s.staffName === "Priya");
    expect(priya).toBeDefined();
    expect(priya?.totalAssigned).toBe(2);
    expect(priya?.bookedCount).toBe(1);
    expect(priya?.followUpCount).toBe(1);
  });

  it("filters correctly when a specific year is requested", async () => {
    const report2026 = await getAnalyticsReportData({ year: "2026" });

    expect(report2026.summary.totalLeads).toBe(2); // l-1 and l-4
    expect(report2026.summary.totalBooked).toBe(1); // l-1
    expect(report2026.summary.totalNew).toBe(1); // l-4
  });

  it("filters correctly when an area is requested", async () => {
    const reportVelachery = await getAnalyticsReportData({ area: "Velachery" });

    expect(reportVelachery.summary.totalLeads).toBe(2); // l-3 and l-4
    expect(reportVelachery.summary.totalBooked).toBe(1); // l-3
  });
});
