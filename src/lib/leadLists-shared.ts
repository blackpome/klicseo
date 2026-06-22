// Client-safe lead lists constants. No "server-only" guard so client components
// can import the types.

export interface LeadListRow {
  id: string;
  name: string;
  created_at: string;
  created_by: string | null; // admin user id who created the list
  assigned_admin_user_id: string | null; // admin user id assigned to this list
  assigned_admin_user?: { email: string | null; name?: string | null } | null;
  assigned_employee_id?: string | null; // legacy employee id, kept for backward compatibility
  lead_count?: number; // for display, not stored in DB
  admin_users?: { email: string | null } | null;
  employees?: { name: string | null } | null;
}

export interface NewLeadList {
  name: string;
  created_by?: string; // optional, will be set from current admin on server
  assigned_admin_user_id?: string | null;
}

export interface LeadListItem {
  list_id: string;
  lead_id: string;
  added_at: string;
}
