// Pure types + static catalog shared by client and server. No Supabase or
// other server-only imports here — that's the whole point of this split.

// job_role now stores a dynamic job slug (see the jobs table), not a fixed enum.
export type JobRole = string;
export type EmploymentType = "PartTime" | "FullTime";
export type EmployeeStatus =
  | "applied"
  | "screening"
  | "hired"
  | "active"
  | "resigned"
  | "rejected";

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

  assigned_admin_user_id?: string | null;
  assigned_admin_user?: { email: string | null; name?: string | null } | null;

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
