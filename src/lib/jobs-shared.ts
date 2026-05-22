// Client-safe job types/metadata. DB access lives in lib/jobs.ts (server-only).
import type { EmploymentType } from "./employees-shared";

export type { EmploymentType };

// --- Application form field config -------------------------------------
// Name & phone are always collected (mandatory employee columns). These are the
// optional fields an admin can show/hide and mark required per job.
export type AppFieldKey = "location" | "aadhaar_number" | "aadhaar_photo" | "profile_photo" | "signature";

export interface AppFieldCfg {
  enabled: boolean;
  required: boolean;
}

export type ApplicationFields = Record<AppFieldKey, AppFieldCfg>;

export const APP_FIELD_DEFS: { key: AppFieldKey; label: string; kind: "text" | "file" | "signature" }[] = [
  { key: "location", label: "Location", kind: "text" },
  { key: "aadhaar_number", label: "Aadhaar number", kind: "text" },
  { key: "aadhaar_photo", label: "Aadhaar photo", kind: "file" },
  { key: "profile_photo", label: "Profile photo", kind: "file" },
  { key: "signature", label: "Signature", kind: "signature" },
];

// Defaults match the original hardcoded form (Aadhaar number optional; rest required).
export const APP_FIELD_DEFAULTS: ApplicationFields = {
  location: { enabled: true, required: true },
  aadhaar_number: { enabled: true, required: false },
  aadhaar_photo: { enabled: true, required: true },
  profile_photo: { enabled: true, required: true },
  signature: { enabled: true, required: true },
};

export function normalizeAppFields(raw: unknown): ApplicationFields {
  const out = {} as ApplicationFields;
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, { enabled?: unknown; required?: unknown }>;
  for (const def of APP_FIELD_DEFS) {
    const v = obj[def.key];
    out[def.key] = {
      enabled: typeof v?.enabled === "boolean" ? v.enabled : APP_FIELD_DEFAULTS[def.key].enabled,
      required: typeof v?.required === "boolean" ? v.required : APP_FIELD_DEFAULTS[def.key].required,
    };
  }
  return out;
}

export interface Job {
  id: string;
  created_at: string;
  updated_at: string;
  slug: string;
  title: string;
  type: EmploymentType;
  blurb: string | null;
  description: string | null;
  location: string | null;
  salary: string | null;
  terms: string | null;
  show_description: boolean;
  show_location: boolean;
  show_salary: boolean;
  show_terms: boolean;
  active: boolean;
  sort_order: number;
  application_fields: ApplicationFields;
}

// Fields the admin can fill in, with which ones support a show/hide toggle.
export interface JobInput {
  title: string;
  type: EmploymentType;
  blurb: string | null;
  description: string | null;
  location: string | null;
  salary: string | null;
  terms: string | null;
  show_description: boolean;
  show_location: boolean;
  show_salary: boolean;
  show_terms: boolean;
  active: boolean;
  sort_order: number;
  application_fields: ApplicationFields;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "job";
}
