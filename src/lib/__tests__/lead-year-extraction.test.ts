import { describe, it, expect } from "vitest";
import { extractLeadYear } from "../area";

describe("extractLeadYear", () => {
  it("extracts year from 'Reg. Date' in custom_fields", () => {
    const cf = {
      CITY: "CHENNAI",
      State: "Tamilnadu",
      "Rto Code": "TN22",
      "Reg. Date": "2025-04-20",
    };
    expect(extractLeadYear(cf, "2026-06-25T05:53:30.922Z")).toBe("2025");
  });

  it("extracts year from 'REG DATE' in custom_fields", () => {
    const cf = {
      REG: "TN22",
      FUEL: "PETROL",
      "REG DATE": "2024-03-18",
    };
    expect(extractLeadYear(cf, "2026-08-18T18:17:51.126Z")).toBe("2024");
  });

  it("extracts year from upload_file when reg date is omitted", () => {
    const cf = {
      upload_file: "2024 CAR SELECT (2).xlsx",
      CITY: "CHENNAI",
    };
    expect(extractLeadYear(cf, "2026-08-18T18:17:51.126Z")).toBe("2024");
  });

  it("falls back to created_at year if custom_fields is empty", () => {
    expect(extractLeadYear(null, "2026-05-30T07:53:13.271Z")).toBe("2026");
    expect(extractLeadYear({}, "2023-11-12T00:00:00.000Z")).toBe("2023");
  });
});
