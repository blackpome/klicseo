import { describe, it, expect, vi } from "vitest";

// Mock server-only and supabase
vi.mock("server-only", () => ({}));
vi.mock("react", () => ({
  cache: (fn: any) => fn,
}));

vi.mock("../supabase", () => ({
  supabase: () => ({
    from: () => ({
      select: () =>
        Promise.resolve({
          data: [
            { pincode: "600040", area: "Anna Nagar West" },
            { pincode: "600042", area: "Velachery" },
            { pincode: "600017", area: "T. Nagar" },
            { pincode: "600020", area: "Adyar" },
            { pincode: "600032", area: "Guindy" },
            { pincode: "600044", area: "Chromepet" },
            { pincode: "600096", area: "Sholinganallur" },
          ],
        }),
    }),
  }),
}));

import { extractAreaFromAddress, extractAllAreasFromAddress, areaFromPincode } from "../area";

describe("Permanent Address Area Extraction Engine", () => {
  describe("areaFromPincode", () => {
    it("resolves valid 6-digit pincodes to known localities", async () => {
      expect(await areaFromPincode("600040")).toBe("Anna Nagar West");
      expect(await areaFromPincode("600042")).toBe("Velachery");
      expect(await areaFromPincode("600017")).toBe("T. Nagar");
      expect(await areaFromPincode("999999")).toBeNull();
      expect(await areaFromPincode(null)).toBeNull();
    });
  });

  describe("extractAreaFromAddress", () => {
    it("extracts locality via embedded 6-digit pincode in address", async () => {
      const addr1 = "No 14, 2nd Main Road, Anna Nagar, Chennai 600040";
      expect(await extractAreaFromAddress(addr1)).toBe("Anna Nagar West");

      const addr2 = "Flat 4B, Lake View Apartments, Velachery - 600042";
      expect(await extractAreaFromAddress(addr2)).toBe("Velachery");

      const addr3 = "Door 5A, GST Road, Chromepet (600044), Chennai";
      expect(await extractAreaFromAddress(addr3)).toBe("Chromepet");
    });

    it("extracts locality via known locality keyword matching when pincode is absent", async () => {
      const addr1 = "Plot 24, 1st Cross Street, Velachery Main Road, Chennai";
      expect(await extractAreaFromAddress(addr1)).toBe("Velachery");

      const addr2 = "Flat 12, Usman Road, T. Nagar, Chennai";
      expect(await extractAreaFromAddress(addr2)).toBe("T. Nagar");

      const addr3 = "123 Rajiv Gandhi Salai, Sholinganallur, Chennai";
      expect(await extractAreaFromAddress(addr3)).toBe("Sholinganallur");

      const addr4 = "No 8, Gandhi Nagar 2nd Avenue, Adyar";
      expect(await extractAreaFromAddress(addr4)).toBe("Adyar");
    });

    it("matches compound locality names prioritizing the longest match", async () => {
      const addr1 = "No. 45, 6th Avenue, Anna Nagar West, Chennai";
      expect(await extractAreaFromAddress(addr1)).toBe("Anna Nagar West");

      const addr2 = "Plot 18, Tambaram West, Chennai";
      expect(await extractAreaFromAddress(addr2)).toBe("Tambaram West");
    });

    it("falls back to address comma segments when no known area matches", async () => {
      const addr = "No. 12, Emerald Avenue, Kolathur, Chennai";
      const res = await extractAreaFromAddress(addr);
      expect(res).toBeTruthy();
      expect(res?.toLowerCase()).toContain("kolathur");
    });

    it("returns null for empty or unspecified addresses", async () => {
      expect(await extractAreaFromAddress(null)).toBeNull();
      expect(await extractAreaFromAddress("")).toBeNull();
      expect(await extractAreaFromAddress("   ")).toBeNull();
    });
  });

  describe("extractAllAreasFromAddress", () => {
    it("captures ALL areas mentioned in a multi-locality address", async () => {
      const addr = "Near Velachery Main Road, Guindy, Chennai 600042";
      const all = await extractAllAreasFromAddress(addr);
      expect(all).toContain("Velachery");
      expect(all).toContain("Guindy");
    });

    it("extracts multiple areas including embedded pincodes", async () => {
      const addr = "Branch 1: Adyar, Branch 2: T. Nagar, Chennai - 600020";
      const all = await extractAllAreasFromAddress(addr);
      expect(all).toContain("Adyar");
      expect(all).toContain("T. Nagar");
    });
  });
});
