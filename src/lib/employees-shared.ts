// Pure types + static catalog shared by client and server. No Supabase or
// other server-only imports here — that's the whole point of this split.

export type JobRole = "CarWash" | "CarDetailing" | "FieldMarketer" | "BackOffice";
export type EmploymentType = "PartTime" | "FullTime";
export type EmployeeStatus =
  | "applied"
  | "screening"
  | "hired"
  | "active"
  | "resigned"
  | "rejected";

export const JOB_CATALOG: {
  id: JobRole;
  label: string;
  type: EmploymentType;
  blurb: string;
}[] = [
  { id: "CarWash",        label: "Car Wash",              type: "PartTime", blurb: "Daily doorstep washes for subscribed customers — early-morning or evening shift." },
  { id: "CarDetailing",   label: "Car Detailing",         type: "PartTime", blurb: "On-site detailing jobs for premium customers — interior, polish, ceramic prep." },
  { id: "FieldMarketer",  label: "Field Marketer",        type: "FullTime", blurb: "Go door-to-door in target apartment complexes and onboard new subscribers." },
  { id: "BackOffice",     label: "Back Office Executive", type: "FullTime", blurb: "Handle phone leads, scheduling, customer follow-ups, and daily ops paperwork." },
];

export function jobByRole(role: string): (typeof JOB_CATALOG)[number] | undefined {
  return JOB_CATALOG.find((j) => j.id === role);
}

export interface EmployeeRow {
  id: string;
  created_at: string;
  status: EmployeeStatus;
  job_role: JobRole;

  name: string;
  phone: string;
  location: string | null;
  aadhaar_number: string | null;
  aadhaar_photo_path: string | null;
  profile_photo_path: string | null;
  signature_path: string | null;
  terms_accepted_at: string | null;

  salary: number | null;
  reminder_call_date: string | null;
  joining_date: string | null;
  resignation_date: string | null;
  notes: string | null;
}

export type NewEmployee = Omit<EmployeeRow, "id" | "created_at" | "status"> & {
  status?: EmployeeStatus;
};

export type EmployeeUpdate = Partial<Omit<EmployeeRow, "id" | "created_at">>;
