import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  cleanPhoneNumber,
  cleanPincode,
  cleanCarNumber,
  parseSpreadsheetBuffer,
  autoDetectMapping,
  normalizeRowsWithMapping,
} from "../lead-import-parser";

describe("lead-import-parser", () => {
  describe("cleanPhoneNumber", () => {
    it("cleans standard 10 digit numbers", () => {
      expect(cleanPhoneNumber("9884504450")).toBe("9884504450");
      expect(cleanPhoneNumber(9884504450)).toBe("9884504450");
    });

    it("strips Indian +91 and 91 prefixes", () => {
      expect(cleanPhoneNumber("+91 98845 04450")).toBe("9884504450");
      expect(cleanPhoneNumber("919884504450")).toBe("9884504450");
    });

    it("resolves scientific notation from Excel (e.g. 8.056741915E9)", () => {
      expect(cleanPhoneNumber("8.056741915E9")).toBe("8056741915");
      expect(cleanPhoneNumber(8.056741915e9)).toBe("8056741915");
      expect(cleanPhoneNumber("9.940044234E9")).toBe("9940044234");
    });

    it("handles null / undefined / empty input", () => {
      expect(cleanPhoneNumber(null)).toBe("");
      expect(cleanPhoneNumber(undefined)).toBe("");
      expect(cleanPhoneNumber("")).toBe("");
    });
  });

  describe("cleanPincode", () => {
    it("strips decimal suffixes from Excel numbers (e.g. 600042.0 -> 600042)", () => {
      expect(cleanPincode("600042.0")).toBe("600042");
      expect(cleanPincode(600042)).toBe("600042");
      expect(cleanPincode("600032.0")).toBe("600032");
    });

    it("extracts 6 digit pincode from string with spaces", () => {
      expect(cleanPincode("PIN: 600091")).toBe("600091");
    });
  });

  describe("cleanCarNumber", () => {
    it("uppercases and removes spaces", () => {
      expect(cleanCarNumber("tn 07 dp 3488")).toBe("TN07DP3488");
      expect(cleanCarNumber("TN09DL3663")).toBe("TN09DL3663");
    });
  });

  describe("parseSpreadsheetBuffer on data/klicseo.xlsx", () => {
    it("successfully parses all 19 rows from reference file", () => {
      const filePath = path.resolve(process.cwd(), "data/klicseo.xlsx");
      const buffer = fs.readFileSync(filePath);
      const parsed = parseSpreadsheetBuffer(buffer, "klicseo.xlsx");

      expect(parsed.totalRows).toBe(19);
      expect(parsed.headers).toContain("Owner Name");
      expect(parsed.headers).toContain("Mobile");
      expect(parsed.headers).toContain("Reg. No");
      expect(parsed.headers).toContain("Permanent Address");
      expect(parsed.headers).toContain("PIN");
      expect(parsed.headers).toContain("Vehicle Maker");
      expect(parsed.headers).toContain("Vehicle Model");
      expect(parsed.headers).toContain("Vehicle Class");
    });

    it("auto-detects mapping accurately for RTO Excel format", () => {
      const filePath = path.resolve(process.cwd(), "data/klicseo.xlsx");
      const buffer = fs.readFileSync(filePath);
      const parsed = parseSpreadsheetBuffer(buffer, "klicseo.xlsx");
      const mapping = autoDetectMapping(parsed.headers);

      expect(mapping.name).toBe("Owner Name");
      expect(mapping.phone).toBe("Mobile");
      expect(mapping.car_number).toBe("Reg. No");
      expect(mapping.address).toBe("Permanent Address");
      expect(mapping.pincode).toBe("PIN");
      expect(mapping.car_brand).toBe("Vehicle Maker");
      expect(mapping.car_model).toBe("Vehicle Model");
      expect(mapping.vehicle_type).toBe("Vehicle Class");
    });

    it("normalizes rows with mapping and preserves custom fields", () => {
      const filePath = path.resolve(process.cwd(), "data/klicseo.xlsx");
      const buffer = fs.readFileSync(filePath);
      const parsed = parseSpreadsheetBuffer(buffer, "klicseo.xlsx");
      const mapping = autoDetectMapping(parsed.headers);
      const normalized = normalizeRowsWithMapping(parsed.rawRows, mapping, true);

      expect(normalized.length).toBe(19);

      // Check first row (COROMANDEL INTERNATIONAL LIMITED)
      const r1 = normalized[0];
      expect(r1.name).toBe("COROMANDEL INTERNATIONAL LIMITED");
      expect(r1.phone).toBe("9884504450");
      expect(r1.car_number).toBe("TN09DL3663");
      expect(r1.pincode).toBe("600032");
      expect(r1.car_brand).toBe("JSW MG MOTOR INDIA PVT LTD");
      expect(r1.isValid).toBe(true);
      expect(r1.custom_fields).toHaveProperty("Fuel Type");
      expect(r1.custom_fields).toHaveProperty("Sale Amount");

      // Check second row (SOBAN VISWANATHAN with scientific phone)
      const r2 = normalized[1];
      expect(r2.name).toBe("SOBAN VISWANATHAN");
      expect(r2.phone).toBe("8056741915");
      expect(r2.car_number).toBe("TN07DP3488");
      expect(r2.pincode).toBe("600042");
      expect(r2.isValid).toBe(true);
    });
  });
});
