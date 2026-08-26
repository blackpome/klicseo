import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.SUPABASE_URL = "https://mock.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";

vi.mock("@/lib/supabase", () => ({
  supabase: () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
}));

import { listAreasWithCounts, setLocationIndexCache } from "../area";
import { matchesFilter } from "../lead-routing";

describe("Folder-Scoped Area Counts & Strict Hot Leads Consistency", () => {
  beforeEach(() => {
    setLocationIndexCache({
      expires: Date.now() + 100000,
      leadMap: new Map(),
      areaToLeadIds: new Map(),
      yearToLeadIds: new Map(),
      allLeads: [
        {
          id: "lead-2026-velachery-upload",
          primaryLocality: "Velachery",
          area: "Velachery",
          year: "2026",
          source: "upload",
          status: "new",
        },
        {
          id: "lead-2026-puzhuthivakkam-upload",
          primaryLocality: "Puzhuthivakkam",
          area: "Puzhuthivakkam",
          year: "2026",
          source: "upload",
          status: "new",
        },
        {
          id: "lead-2025-madipakkam-upload",
          primaryLocality: "Madipakkam",
          area: "Madipakkam",
          year: "2025",
          source: "upload",
          status: "new",
        },
        {
          id: "lead-hot-admin-adyar",
          primaryLocality: "Adyar",
          area: "Adyar",
          year: "2026",
          source: "admin",
          status: "new",
        },
        {
          id: "lead-website-wizard-annanagar",
          primaryLocality: "Anna Nagar",
          area: "Anna Nagar",
          year: "2026",
          source: "wizard",
          status: "new",
        },
      ],
    });
  });

  it("scopes listAreasWithCounts to 2026 year folder", async () => {
    const areas2026 = await listAreasWithCounts({ folder: "year_2026" });
    const areaNames = areas2026.map((a) => a.area);

    expect(areaNames).toContain("Velachery");
    expect(areaNames).toContain("Puzhuthivakkam");
    expect(areaNames).toContain("Adyar");
    expect(areaNames).toContain("Anna Nagar");
    expect(areaNames).not.toContain("Madipakkam"); // 2025 lead
  });

  it("scopes listAreasWithCounts to 2025 year folder", async () => {
    const areas2025 = await listAreasWithCounts({ folder: "year_2025" });
    const areaNames = areas2025.map((a) => a.area);

    expect(areaNames).toEqual(["Madipakkam"]);
    expect(areaNames).not.toContain("Velachery");
    expect(areaNames).not.toContain("Puzhuthivakkam");
  });

  it("scopes listAreasWithCounts to hot_leads folder (admin manual leads only)", async () => {
    const hotAreas = await listAreasWithCounts({ folder: "hot_leads" });
    const areaNames = hotAreas.map((a) => a.area);

    expect(areaNames).toEqual(["Adyar"]);
    expect(areaNames).not.toContain("Velachery"); // upload lead
    expect(areaNames).not.toContain("Anna Nagar"); // wizard lead
  });

  it("strictly differentiates hot_leads vs bulk uploads vs website leads in lead routing", () => {
    const adminLead = { id: "1", source: "admin", status: "new" };
    const manualLead = { id: "2", source: "manual", status: "new" };
    const uploadLead = { id: "3", source: "upload", status: "new" };
    const wizardLead = { id: "4", source: "wizard", status: "new" };

    // Hot Leads folder strictly matches admin and manual leads
    expect(matchesFilter(adminLead as any, { folder: "hot_leads" })).toBe(true);
    expect(matchesFilter(manualLead as any, { folder: "hot_leads" })).toBe(true);
    expect(matchesFilter(uploadLead as any, { folder: "hot_leads" })).toBe(false);
    expect(matchesFilter(wizardLead as any, { folder: "hot_leads" })).toBe(false);

    // Website Form folder strictly matches wizard leads
    expect(matchesFilter(wizardLead as any, { folder: "website_form" })).toBe(true);
    expect(matchesFilter(adminLead as any, { folder: "website_form" })).toBe(false);
    expect(matchesFilter(uploadLead as any, { folder: "website_form" })).toBe(false);
  });
});
