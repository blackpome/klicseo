import { describe, it, expect, vi, beforeEach } from "vitest";
import { matchesFilter, countMatchingLeads, executeLeadAllocation } from "../lead-routing";
import * as areaModule from "../area";

describe("Folder-Specific + Location-Scoped Lead Allocation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("correctly matches leads based on folder year and location alias", () => {
    const lead2026Puzhuthivakkam = {
      area: "Puzhuthivakkam",
      address: "Door 4, Puzhuthivakkam, Chennai 600091",
      pincode: "600091",
      status: "new",
      year: "2026",
      source: "upload",
    };

    const lead2025Velachery = {
      area: "Velachery",
      address: "10 Main Rd, Velachery, Chennai 600042",
      pincode: "600042",
      status: "new",
      year: "2025",
      source: "upload",
    };

    // Scoped to 2026 + Puzhuthivakkam
    expect(
      matchesFilter(lead2026Puzhuthivakkam as any, {
        folder: "year_2026",
        areas: ["Puzhuthivakkam"],
        statuses: ["new"],
      }),
    ).toBe(true);

    // Filtered out by year mismatch
    expect(
      matchesFilter(lead2025Velachery as any, {
        folder: "year_2026",
        areas: ["Velachery"],
        statuses: ["new"],
      }),
    ).toBe(false);

    // Filtered out by area mismatch
    expect(
      matchesFilter(lead2026Puzhuthivakkam as any, {
        folder: "year_2026",
        areas: ["Velachery"],
        statuses: ["new"],
      }),
    ).toBe(false);
  });

  it("correctly filters website_form channel folder", () => {
    const wizardLead = {
      area: "Adyar",
      status: "new",
      source: "wizard",
    };

    const uploadLead = {
      area: "Adyar",
      status: "new",
      source: "upload",
    };

    expect(
      matchesFilter(wizardLead as any, {
        folder: "website_form",
        statuses: ["new"],
      }),
    ).toBe(true);

    expect(
      matchesFilter(uploadLead as any, {
        folder: "website_form",
        statuses: ["new"],
      }),
    ).toBe(false);
  });

  it("handles Call Not Responded status allocation within a specific year and area", () => {
    const cnrLead = {
      area: "Madipakkam",
      address: "Bazaar Rd, Madipakkam",
      status: "call_not_responded",
      year: "2025",
      source: "upload",
    };

    // When CNR is included in statuses
    expect(
      matchesFilter(cnrLead as any, {
        folder: "year_2025",
        areas: ["Madipakkam"],
        statuses: ["call_not_responded", "new"],
      }),
    ).toBe(true);

    // When only new is requested
    expect(
      matchesFilter(cnrLead as any, {
        folder: "year_2025",
        areas: ["Madipakkam"],
        statuses: ["new"],
      }),
    ).toBe(false);
  });
});
