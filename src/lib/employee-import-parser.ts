import * as XLSX from "xlsx";
import { cleanPhoneNumber } from "./lead-import-parser";
import type { EmployeeStatus, JobRole } from "./employees-shared";

export interface CanonicalEmployeeField {
  key: string;
  label: string;
  required?: boolean;
  description: string;
  aliases: string[];
}

export const CANONICAL_EMPLOYEE_FIELDS: CanonicalEmployeeField[] = [
  {
    key: "name",
    label: "Full Name",
    required: true,
    description: "Employee or applicant full name",
    aliases: [
      "name",
      "employee name",
      "staff name",
      "worker name",
      "worker",
      "full name",
      "applicant",
      "candidate",
      "person name",
      "emp name",
    ],
  },
  {
    key: "phone",
    label: "Mobile Number",
    required: true,
    description: "10-digit Indian mobile number",
    aliases: [
      "phone",
      "mobile",
      "mobile number",
      "contact",
      "phone number",
      "cell",
      "contact number",
      "tel",
      "mobile no",
      "ph no",
    ],
  },
  {
    key: "job_role",
    label: "Job Role / Designation",
    description: "Role or position (e.g. Car Cleaner, Supervisor, Telecaller)",
    aliases: [
      "role",
      "job role",
      "designation",
      "position",
      "job",
      "post",
      "category",
      "title",
      "job title",
      "work type",
    ],
  },
  {
    key: "status",
    label: "Status",
    description: "applied, screening, hired, active, resigned, rejected",
    aliases: [
      "status",
      "employment status",
      "state",
      "stage",
      "current status",
    ],
  },
  {
    key: "location",
    label: "Location / Area",
    description: "Residential area or branch locality in Chennai",
    aliases: [
      "location",
      "area",
      "address",
      "city",
      "place",
      "zone",
      "locality",
      "branch",
      "work location",
    ],
  },
  {
    key: "salary",
    label: "Salary / Monthly Pay (₹)",
    description: "Monthly salary or wage in INR",
    aliases: [
      "salary",
      "wages",
      "pay",
      "monthly salary",
      "ctc",
      "stipend",
      "amount",
      "wage",
      "monthly pay",
      "package",
    ],
  },
  {
    key: "joining_date",
    label: "Joining Date (DOJ)",
    description: "Date of joining (YYYY-MM-DD or DD/MM/YYYY)",
    aliases: [
      "joining date",
      "doj",
      "date of joining",
      "joined",
      "start date",
      "hire date",
      "joining",
    ],
  },
  {
    key: "aadhaar_number",
    label: "Aadhaar Number",
    description: "12-digit Indian national ID",
    aliases: [
      "aadhaar",
      "aadhar",
      "aadhaar number",
      "aadhar number",
      "aadhaar no",
      "aadhar no",
      "uidai",
      "id number",
    ],
  },
  {
    key: "notes",
    label: "Internal Notes / Remarks",
    description: "Emergency contact, background check, or performance remarks",
    aliases: [
      "notes",
      "remarks",
      "comments",
      "description",
      "details",
      "emergency contact",
      "info",
    ],
  },
];

export interface ParsedEmployeeSpreadsheet {
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

export type EmployeeColumnMapping = Record<string, string>; // targetKey -> sourceHeader

export interface NormalizedEmployeeImportRow {
  name: string;
  phone: string;
  job_role: string;
  status: EmployeeStatus;
  location: string | null;
  salary: number | null;
  joining_date: string | null;
  aadhaar_number: string | null;
  notes: string | null;
  isValid: boolean;
  validationError?: string;
  raw: Record<string, unknown>;
}

/**
 * Parses an ArrayBuffer of an uploaded Excel or CSV file.
 */
export function parseEmployeeSpreadsheetBuffer(
  buffer: ArrayBuffer,
  sheetName?: string,
): ParsedEmployeeSpreadsheet {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error("Spreadsheet contains no sheets.");
  }

  const selectedSheet = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
  const worksheet = workbook.Sheets[selectedSheet];
  if (!worksheet) {
    throw new Error(`Sheet "${selectedSheet}" not found in workbook.`);
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
    raw: false,
    dateNF: "YYYY-MM-DD",
  });

  const headerSet = new Set<string>();
  for (const row of rows.slice(0, 50)) {
    for (const k of Object.keys(row)) {
      const trimmed = k.trim();
      if (trimmed && !trimmed.startsWith("__EMPTY")) {
        headerSet.add(trimmed);
      }
    }
  }

  return {
    sheetNames,
    selectedSheet,
    headers: Array.from(headerSet),
    rows,
    totalRows: rows.length,
  };
}

/**
 * Auto-detects the mapping between spreadsheet headers and canonical employee fields.
 */
export function autoDetectEmployeeMapping(headers: string[]): EmployeeColumnMapping {
  const mapping: EmployeeColumnMapping = {};
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    cleaned: h.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim(),
  }));

  for (const field of CANONICAL_EMPLOYEE_FIELDS) {
    // 1. Exact alias match
    let match = normalizedHeaders.find((h) => field.aliases.includes(h.cleaned));

    // 2. Substring match if no exact match
    if (!match) {
      match = normalizedHeaders.find((h) =>
        field.aliases.some((a) => a.length >= 4 && (h.cleaned.includes(a) || a.includes(h.cleaned))),
      );
    }

    if (match) {
      mapping[field.key] = match.original;
    }
  }

  return mapping;
}

/**
 * Normalizes a currency or salary numeric string.
 * Example: "₹18,000 / month", "18000.00", "25k" -> 18000
 */
export function cleanSalary(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) ? null : Math.round(val);
  const str = String(val).trim().toLowerCase();
  if (!str) return null;

  // Handle "18k", "25k"
  if (/^\d+(\.\d+)?k$/.test(str)) {
    const num = parseFloat(str.replace("k", ""));
    return isNaN(num) ? null : Math.round(num * 1000);
  }

  const cleaned = str.replace(/[₹$,/a-zA-Z\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num);
}

/**
 * Normalizes Aadhaar number into clean digits (12 digits).
 */
export function cleanAadhaar(val: unknown): string | null {
  if (!val) return null;
  const digits = String(val).replace(/\D/g, "");
  if (digits.length === 12) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
  }
  return digits || null;
}

/**
 * Normalizes a date string into standard ISO date (YYYY-MM-DD).
 */
export function cleanDate(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (!str) return null;

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(str);
  if (ddmmyyyy) {
    const d = ddmmyyyy[1].padStart(2, "0");
    const m = ddmmyyyy[2].padStart(2, "0");
    const y = ddmmyyyy[3];
    return `${y}-${m}-${d}`;
  }

  // Attempt JS Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Normalizes employee status string into valid EmployeeStatus.
 */
export function cleanEmployeeStatus(val: unknown, defaultStatus: EmployeeStatus = "active"): EmployeeStatus {
  if (!val) return defaultStatus;
  const s = String(val).trim().toLowerCase();
  if (s.includes("active") || s.includes("working") || s.includes("joined") || s.includes("employed")) return "active";
  if (s.includes("hire") || s.includes("selected") || s.includes("offer")) return "hired";
  if (s.includes("screen") || s.includes("interview") || s.includes("shortlist")) return "screening";
  if (s.includes("apply") || s.includes("new") || s.includes("applicant")) return "applied";
  if (s.includes("resign") || s.includes("left") || s.includes("exit") || s.includes("relieved")) return "resigned";
  if (s.includes("reject") || s.includes("declined") || s.includes("disqualified")) return "rejected";
  return defaultStatus;
}

/**
 * Normalizes raw spreadsheet rows according to column mappings.
 */
export function normalizeEmployeeRowsWithMapping(
  rows: Record<string, unknown>[],
  mapping: EmployeeColumnMapping,
  options: {
    defaultStatus?: EmployeeStatus;
    defaultJobRole?: JobRole;
    sourceFileName?: string;
  } = {},
): NormalizedEmployeeImportRow[] {
  const defaultStatus = options.defaultStatus ?? "active";
  const defaultJobRole = options.defaultJobRole ?? "car-cleaner";

  return rows.map((row) => {
    const getValue = (key: string): unknown => {
      const header = mapping[key];
      return header ? row[header] : undefined;
    };

    const name = String(getValue("name") ?? "").trim();
    const phoneRaw = getValue("phone");
    const phone = cleanPhoneNumber(phoneRaw) ?? "";

    const jobRoleRaw = getValue("job_role");
    const job_role = jobRoleRaw ? String(jobRoleRaw).trim() : defaultJobRole;

    const statusRaw = getValue("status");
    const status = cleanEmployeeStatus(statusRaw, defaultStatus);

    const locationRaw = getValue("location");
    const location = locationRaw ? String(locationRaw).trim() : null;

    const salary = cleanSalary(getValue("salary"));
    const joining_date = cleanDate(getValue("joining_date"));
    const aadhaar_number = cleanAadhaar(getValue("aadhaar_number"));

    const notesRaw = getValue("notes");
    let notes = notesRaw ? String(notesRaw).trim() : null;
    if (options.sourceFileName) {
      notes = notes ? `${notes} (Imported from ${options.sourceFileName})` : `Imported from ${options.sourceFileName}`;
    }

    // Validation checks
    let isValid = true;
    let validationError: string | undefined;

    if (!name) {
      isValid = false;
      validationError = "Missing employee name";
    } else if (!phone || phone.length < 10) {
      isValid = false;
      validationError = "Invalid 10-digit mobile number";
    }

    return {
      name,
      phone,
      job_role,
      status,
      location,
      salary,
      joining_date,
      aadhaar_number,
      notes,
      isValid,
      validationError,
      raw: row,
    };
  });
}

/**
 * Generates sample CSV string for employee template download.
 */
export function generateEmployeeSampleCsv(): string {
  const headers = [
    "Full Name",
    "Mobile Number",
    "Job Role",
    "Status",
    "Location",
    "Monthly Salary",
    "Date of Joining",
    "Aadhaar Number",
    "Remarks",
  ];

  const sampleRows = [
    [
      "Ramesh Kumar",
      "9884504450",
      "Car Cleaner",
      "Active",
      "Velachery, Chennai",
      "18000",
      "2024-01-15",
      "123456789012",
      "Day shift, verified background",
    ],
    [
      "Praveen Raj",
      "9791816802",
      "Supervisor",
      "Active",
      "Guindy, Chennai",
      "24000",
      "2023-11-01",
      "987654321098",
      "South Zone team lead",
    ],
    [
      "Vignesh M",
      "7010126665",
      "Detailing Specialist",
      "Active",
      "Alandur, Chennai",
      "22000",
      "2024-03-10",
      "554433221100",
      "Ceramic coating expert",
    ],
    [
      "Suresh Babu",
      "8754446090",
      "Telecaller",
      "Hired",
      "Madipakkam, Chennai",
      "16000",
      "2024-06-01",
      "667788990011",
      "Inbound inquiries team",
    ],
  ];

  const csvLines = [
    headers.join(","),
    ...sampleRows.map((r) =>
      r.map((v) => (v.includes(",") ? `"${v}"` : v)).join(","),
    ),
  ];

  return csvLines.join("\n");
}
