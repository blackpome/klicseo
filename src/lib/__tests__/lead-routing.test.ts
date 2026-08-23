import { describe, it, expect } from "vitest";
import { matchesFilter, type LeadAllocationFilter } from "../lead-routing";

describe("Lead Allocation Condition Matcher", () => {
  describe("matchesFilter: Area & Pincode Filter", () => {
    it("matches area name case-insensitively and with partial text", () => {
      const filter: LeadAllocationFilter = {
        areas: ["Velachery", "OMR", "Tambaram"],
      };

      expect(matchesFilter({ area: "Velachery, Chennai" }, filter)).toBe(true);
      expect(matchesFilter({ area: "omr road" }, filter)).toBe(true);
      expect(matchesFilter({ area: "TAMBARAM SANATORIUM" }, filter)).toBe(true);
      expect(matchesFilter({ area: "Anna Nagar" }, filter)).toBe(false);
      expect(matchesFilter({ area: null }, filter)).toBe(false);
    });

    it("matches area name from permanent address when area column is empty", () => {
      const filter: LeadAllocationFilter = {
        areas: ["Velachery", "Anna Nagar"],
      };

      expect(
        matchesFilter(
          { area: null, address: "Plot 12, 1st Main Rd, Velachery, Chennai" },
          filter,
        ),
      ).toBe(true);
      expect(
        matchesFilter(
          { area: null, address: "No 45, Anna Nagar West, Chennai - 600040" },
          filter,
        ),
      ).toBe(true);
      expect(
        matchesFilter(
          { area: null, address: "Door 8, Saidapet, Chennai" },
          filter,
        ),
      ).toBe(false);
    });

    it("matches pincodes accurately", () => {
      const filter: LeadAllocationFilter = {
        pincodes: ["600042", "600096"],
      };

      expect(matchesFilter({ pincode: "600042" }, filter)).toBe(true);
      expect(matchesFilter({ pincode: "600096" }, filter)).toBe(true);
      expect(matchesFilter({ pincode: "600040" }, filter)).toBe(false);
    });
  });

  describe("matchesFilter: Services & Minimum Price Thresholds", () => {
    it("matches service categories", () => {
      const filter: LeadAllocationFilter = {
        services: ["Ceramic Coating", "Paint Protection Film (PPF)"],
      };

      expect(matchesFilter({ service: "Ceramic Coating" }, filter)).toBe(true);
      expect(matchesFilter({ service: "Paint Protection Film (PPF)" }, filter)).toBe(true);
      expect(matchesFilter({ service: "Deep Interior Cleaning" }, filter)).toBe(false);
      expect(matchesFilter({ service: null }, filter)).toBe(false);
    });

    it("evaluates minimum price threshold", () => {
      const filter: LeadAllocationFilter = {
        min_price: 5000,
      };

      expect(matchesFilter({ price_total: 5000 }, filter)).toBe(true);
      expect(matchesFilter({ price_total: 12500 }, filter)).toBe(true);
      expect(matchesFilter({ price_total: 4999 }, filter)).toBe(false);
      expect(matchesFilter({ price_total: null }, filter)).toBe(false);
      expect(matchesFilter({ price_total: 0 }, filter)).toBe(false);
    });
  });

  describe("matchesFilter: Combined Criteria", () => {
    it("matches when all filter conditions match and rejects otherwise", () => {
      const filter: LeadAllocationFilter = {
        areas: ["Velachery", "OMR"],
        services: ["Ceramic Coating"],
        min_price: 7000,
      };

      // Fully matching lead
      expect(
        matchesFilter(
          {
            area: "Velachery",
            service: "Ceramic Coating",
            price_total: 8500,
          },
          filter,
        ),
      ).toBe(true);

      // Area mismatch
      expect(
        matchesFilter(
          {
            area: "Anna Nagar",
            service: "Ceramic Coating",
            price_total: 8500,
          },
          filter,
        ),
      ).toBe(false);

      // Price mismatch
      expect(
        matchesFilter(
          {
            area: "Velachery",
            service: "Ceramic Coating",
            price_total: 5000,
          },
          filter,
        ),
      ).toBe(false);
    });

    it("matches all leads when filter is empty", () => {
      expect(matchesFilter({}, {})).toBe(true);
      expect(matchesFilter({ area: "Any Area", service: "Any Service" }, {})).toBe(true);
    });
  });
});
