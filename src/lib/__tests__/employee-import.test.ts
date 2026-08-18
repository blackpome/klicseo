import { describe, it, expect } from "vitest";
import {
  cleanSalary,
  cleanAadhaar,
  cleanDate,
  cleanEmployeeStatus,
  autoDetectEmployeeMapping,
  normalizeEmployeeRowsWithMapping,
  generateEmployeeSampleCsv,
} from "../employee-import-parser";

describe("employee-import-parser", () => {
  describe("cleanSalary", () => {
    it("parses numeric values correctly", () => {
      expect(cleanSalary(18000)).toBe(18000);
      expect(cleanSalary("18000")).toBe(18000);
      expect(cleanSalary("₹18,000 / month")).toBe(18000);
      expect(cleanSalary("24,500.00")).toBe(24500);
    });

    it("parses 'k' shorthand notation", () => {
      expect(cleanSalary("18k")).toBe(18000);
      expect(cleanSalary("24.5k")).toBe(24500);
    });

    it("returns null for empty or invalid values", () => {
      expect(cleanSalary(null)).toBeNull();
      expect(cleanSalary("")).toBeNull();
      expect(cleanSalary("N/A")).toBeNull();
    });
  });

  describe("cleanAadhaar", () => {
    it("formats 12-digit aadhaar numbers with spaces", () => {
      expect(cleanAadhaar("123456789012")).toBe("1234 5678 9012");
      expect(cleanAadhaar("1234 5678 9012")).toBe("1234 5678 9012");
    });

    it("handles null or short values", () => {
      expect(cleanAadhaar(null)).toBeNull();
      expect(cleanAadhaar("")).toBeNull();
    });
  });

  describe("cleanDate", () => {
    it("normalizes standard ISO date strings", () => {
      expect(cleanDate("2024-01-15")).toBe("2024-01-15");
    });

    it("normalizes DD/MM/YYYY and DD-MM-YYYY date formats", () => {
      expect(cleanDate("15/01/2024")).toBe("2024-01-15");
      expect(cleanDate("05-11-2023")).toBe("2023-11-05");
    });

    it("handles JS Date instances", () => {
      const d = new Date("2024-06-01T00:00:00Z");
      expect(cleanDate(d)).toBe("2024-06-01");
    });

    it("returns null for invalid strings", () => {
      expect(cleanDate("")).toBeNull();
      expect(cleanDate("not-a-date")).toBeNull();
    });
  });

  describe("cleanEmployeeStatus", () => {
    it("maps status variations accurately", () => {
      expect(cleanEmployeeStatus("Active")).toBe("active");
      expect(cleanEmployeeStatus("Employed")).toBe("active");
      expect(cleanEmployeeStatus("Hired")).toBe("hired");
      expect(cleanEmployeeStatus("Selected for job")).toBe("hired");
      expect(cleanEmployeeStatus("Screening")).toBe("screening");
      expect(cleanEmployeeStatus("Applicant")).toBe("applied");
      expect(cleanEmployeeStatus("Resigned")).toBe("resigned");
      expect(cleanEmployeeStatus("Rejected")).toBe("rejected");
    });

    it("uses defaultStatus when empty", () => {
      expect(cleanEmployeeStatus("", "hired")).toBe("hired");
      expect(cleanEmployeeStatus(null, "active")).toBe("active");
    });
  });

  describe("autoDetectEmployeeMapping", () => {
    it("detects common employee column headers", () => {
      const headers = [
        "Employee Name",
        "Mobile Number",
        "Job Role",
        "Monthly Salary",
        "Location",
        "Date of Joining",
        "Aadhaar Number",
        "Remarks",
      ];
      const mapping = autoDetectEmployeeMapping(headers);

      expect(mapping.name).toBe("Employee Name");
      expect(mapping.phone).toBe("Mobile Number");
      expect(mapping.job_role).toBe("Job Role");
      expect(mapping.salary).toBe("Monthly Salary");
      expect(mapping.location).toBe("Location");
      expect(mapping.joining_date).toBe("Date of Joining");
      expect(mapping.aadhaar_number).toBe("Aadhaar Number");
      expect(mapping.notes).toBe("Remarks");
    });
  });

  describe("normalizeEmployeeRowsWithMapping", () => {
    it("normalizes valid rows and marks invalid rows", () => {
      const rows = [
        {
          "Worker Name": "Ramesh Kumar",
          "Contact No": "9884504450",
          Role: "Supervisor",
          Pay: "24000",
          Loc: "Velachery",
        },
        {
          "Worker Name": "",
          "Contact No": "9791816802",
        },
        {
          "Worker Name": "Praveen",
          "Contact No": "123", // invalid phone
        },
      ];

      const mapping = {
        name: "Worker Name",
        phone: "Contact No",
        job_role: "Role",
        salary: "Pay",
        location: "Loc",
      };

      const normalized = normalizeEmployeeRowsWithMapping(rows, mapping, {
        defaultJobRole: "car-cleaner",
        defaultStatus: "active",
      });

      expect(normalized).toHaveLength(3);

      // Row 1: Valid
      expect(normalized[0].isValid).toBe(true);
      expect(normalized[0].name).toBe("Ramesh Kumar");
      expect(normalized[0].phone).toBe("9884504450");
      expect(normalized[0].job_role).toBe("Supervisor");
      expect(normalized[0].salary).toBe(24000);
      expect(normalized[0].location).toBe("Velachery");

      // Row 2: Missing name
      expect(normalized[1].isValid).toBe(false);
      expect(normalized[1].validationError).toBe("Missing employee name");

      // Row 3: Invalid phone
      expect(normalized[2].isValid).toBe(false);
      expect(normalized[2].validationError).toBe("Invalid 10-digit mobile number");
    });
  });

  describe("generateEmployeeSampleCsv", () => {
    it("generates a well-formed CSV template", () => {
      const csv = generateEmployeeSampleCsv();
      expect(csv).toContain("Full Name,Mobile Number,Job Role");
      expect(csv).toContain("Ramesh Kumar");
      expect(csv).toContain("9884504450");
    });
  });
});
