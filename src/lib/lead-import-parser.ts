import * as XLSX from "xlsx";
import type { LeadStatus } from "./leads-shared";

export interface CanonicalLeadField {
  key: string;
  label: string;
  required?: boolean;
  description: string;
}

export const CANONICAL_LEAD_FIELDS: CanonicalLeadField[] = [
  { key: "name", label: "Customer / Owner Name", required: false, description: "Full name of the vehicle owner" },
  { key: "phone", label: "Mobile / Phone Number", required: true, description: "10-digit mobile number" },
  { key: "car_number", label: "Registration / Car Number", required: false, description: "License plate number (e.g. TN07DP3488)" },
  { key: "car_brand", label: "Vehicle Maker / Brand", required: false, description: "Manufacturer (e.g. Hyundai, Toyota)" },
  { key: "car_model", label: "Vehicle Model", required: false, description: "Model name (e.g. Creta, Fortuner)" },
  { key: "vehicle_type", label: "Vehicle Class / Body Type", required: false, description: "Car segment (e.g. Hatchback, Sedan, SUV)" },
  { key: "address", label: "Permanent Address", required: false, description: "Full street / residential address" },
  { key: "pincode", label: "PIN / Postal Code", required: false, description: "6-digit postal code (auto-derives locality area)" },
];

/** Synonyms used to automatically match uploaded headers to standard fields */
const HEADER_SYNONYMS: Record<string, string[]> = {
  name: ["owner name", "customer name", "client name", "name", "owner", "full name", "contact name"],
  phone: ["mobile", "mobile number", "phone", "phone number", "contact", "contact number", "cell", "cell phone"],
  car_number: ["reg. no", "reg no", "registration number", "reg_no", "reg number", "car number", "car_number", "plate", "plate number", "vehicle number", "veh no"],
  car_brand: ["vehicle maker", "maker", "brand", "car brand", "manufacturer", "make"],
  car_model: ["vehicle model", "model", "car model", "variant", "car_model"],
  vehicle_type: ["vehicle class", "class", "body type", "body_type", "type", "segment", "vehicle type"],
  address: ["permanent address", "address", "location address", "residential address", "street address", "residence"],
  pincode: ["pin", "pincode", "pin code", "postal code", "zip", "zip code"],
};

/** Normalize phone number by extracting digits, resolving scientific notation, and stripping Indian 91 country code */
export function cleanPhoneNumber(raw: unknown): string {
  if (raw == null) return "";
  let str = String(raw).trim();
  // If scientific notation e.g. 8.056741915E9
  if (/^[0-9.]+[eE][+-]?[0-9]+$/.test(str)) {
    const num = Number(str);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      str = Math.round(num).toString();
    }
  }
  const digits = str.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits;
}

/** Clean pincode by removing decimal places (e.g. 600042.0 -> 600042) */
export function cleanPincode(raw: unknown): string {
  if (raw == null) return "";
  const str = String(raw).trim();
  const digits = str.replace(/\..*$/, "").replace(/\D/g, "");
  return digits.length >= 6 ? digits.slice(0, 6) : digits;
}

/** Clean car registration number */
export function cleanCarNumber(raw: unknown): string {
  if (raw == null) return "";
  return String(raw).trim().toUpperCase().replace(/\s+/g, "");
}

/** Clean general text */
export function cleanText(raw: unknown): string {
  if (raw == null) return "";
  if (raw instanceof Date) {
    return raw.toISOString().split("T")[0];
  }
  return String(raw).trim();
}

export interface ParsedSpreadsheet {
  fileName: string;
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  rawRows: Array<Record<string, unknown>>;
  totalRows: number;
}

/**
 * Parse an Excel (.xlsx, .xls) or CSV ArrayBuffer/File into sheets, headers, and rows
 */
export function parseSpreadsheetBuffer(buffer: ArrayBuffer | Uint8Array, fileName: string): ParsedSpreadsheet {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: "array", cellDates: true, raw: false });

  const sheetNames = workbook.SheetNames;
  const selectedSheet = sheetNames[0] || "Sheet1";
  const worksheet = workbook.Sheets[selectedSheet];

  if (!worksheet) {
    return {
      fileName,
      sheetNames: [],
      selectedSheet: "",
      headers: [],
      rawRows: [],
      totalRows: 0,
    };
  }

  // Get data as array of objects with string keys
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

  // Extract unique headers across all rows
  const headerSet = new Set<string>();
  rawRows.forEach((row) => {
    Object.keys(row).forEach((k) => {
      const trimmed = k.trim();
      if (trimmed && !trimmed.startsWith("__EMPTY")) headerSet.add(trimmed);
    });
  });

  const headers = Array.from(headerSet);

  return {
    fileName,
    sheetNames,
    selectedSheet,
    headers,
    rawRows,
    totalRows: rawRows.length,
  };
}

export type ColumnMapping = Record<string, string>; // targetKey -> sourceHeader (e.g. { name: "Owner Name", phone: "Mobile" })

/**
 * Auto-detect column mappings by matching file headers against canonical synonym dictionary
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    normalized: h.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
  }));

  for (const field of CANONICAL_LEAD_FIELDS) {
    const synonyms = (HEADER_SYNONYMS[field.key] || [field.key.toLowerCase()]).map((s) =>
      s.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
    );
    let matchedHeader = "";

    // 1. Exact match
    for (const item of normalizedHeaders) {
      if (synonyms.includes(item.normalized)) {
        matchedHeader = item.original;
        break;
      }
    }

    // 2. Partial word match if not matched
    if (!matchedHeader) {
      for (const item of normalizedHeaders) {
        if (synonyms.some((syn) => item.normalized.includes(syn) || (syn.length > 3 && item.normalized.includes(syn)))) {
          matchedHeader = item.original;
          break;
        }
      }
    }

    if (matchedHeader) {
      mapping[field.key] = matchedHeader;
    }
  }

  return mapping;
}

export interface NormalizedImportRow {
  rowNumber: number;
  name: string | null;
  phone: string | null;
  car_number: string | null;
  car_brand: string | null;
  car_model: string | null;
  vehicle_type: string | null;
  address: string | null;
  pincode: string | null;
  custom_fields: Record<string, string> | null;
  isValid: boolean;
  validationError?: string;
}

/**
 * Transform raw spreadsheet rows into normalized lead rows using the chosen column mapping.
 * Any unmapped columns in the raw row are stored into custom_fields.
 */
export function normalizeRowsWithMapping(
  rawRows: Array<Record<string, unknown>>,
  mapping: ColumnMapping,
  saveUnmappedToCustomFields = true,
): NormalizedImportRow[] {
  // Identify which source headers are mapped to standard fields
  const mappedSourceHeaders = new Set(Object.values(mapping).filter(Boolean));

  return rawRows.map((row, idx) => {
    const getVal = (targetKey: string) => {
      const srcHeader = mapping[targetKey];
      return srcHeader ? row[srcHeader] : undefined;
    };

    const name = cleanText(getVal("name")) || null;
    const phone = cleanPhoneNumber(getVal("phone")) || null;
    const carNumber = cleanCarNumber(getVal("car_number")) || null;
    const carBrand = cleanText(getVal("car_brand")) || null;
    const carModel = cleanText(getVal("car_model")) || null;
    const vehicleType = cleanText(getVal("vehicle_type")) || null;
    const address = cleanText(getVal("address")) || null;
    const pincode = cleanPincode(getVal("pincode")) || null;

    // Collect unmapped columns as custom fields
    const customFields: Record<string, string> = {};
    if (saveUnmappedToCustomFields) {
      for (const [key, val] of Object.entries(row)) {
        const trimmedKey = key.trim();
        if (!trimmedKey || trimmedKey.startsWith("__EMPTY")) continue;
        if (!mappedSourceHeaders.has(trimmedKey)) {
          const cleanedVal = cleanText(val);
          if (cleanedVal) {
            customFields[trimmedKey] = cleanedVal;
          }
        }
      }
    }

    const isValidPhone = Boolean(phone && phone.length >= 10);
    const hasAnyIdentity = Boolean(name || phone || carNumber);

    let isValid = true;
    let validationError: string | undefined;

    if (!hasAnyIdentity) {
      isValid = false;
      validationError = "Empty row (no name, phone, or car number)";
    } else if (!phone) {
      isValid = false;
      validationError = "Missing phone number";
    } else if (!isValidPhone) {
      isValid = false;
      validationError = `Invalid phone length (${phone.length} digits)`;
    }

    return {
      rowNumber: idx + 2, // 1-indexed plus header row
      name,
      phone,
      car_number: carNumber,
      car_brand: carBrand,
      car_model: carModel,
      vehicle_type: vehicleType,
      address,
      pincode,
      custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
      isValid,
      validationError,
    };
  });
}

export interface BulkImportPayload {
  rows: NormalizedImportRow[];
  targetListId?: string | null;
  newListName?: string | null;
  assignedAdminUserId?: string | null;
  defaultStatus: LeadStatus;
  duplicateStrategy: "skip" | "update" | "allow";
  sourceFileName?: string;
}
