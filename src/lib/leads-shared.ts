// Client-safe lead constants. No "server-only" guard so client components
// (status dropdown, notification bell) can import the labels/colors. DB access
// lives in lib/leads.ts (server-only), which re-exports everything here.

// "draft" is for in-progress booking-wizard captures — partial data saved
// before the user reached the final submit. Everything else is a completed
// lead. Drafts are excluded from the default admin tabs and only show on
// their own tab so they don't drown out actionable leads.
export type LeadStatus = "draft" | "new" | "contacted" | "call_not_responded" | "booked" | "cancelled";

export const LEAD_STATUSES: LeadStatus[] = [
  "draft",
  "new",
  "contacted",
  "call_not_responded",
  "booked",
  "cancelled",
];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  draft: "Draft",
  new: "New",
  contacted: "Contacted",
  call_not_responded: "Call not responded",
  booked: "Booked",
  cancelled: "Cancelled",
};

export const LEAD_STATUS_COLOR: Record<LeadStatus, string> = {
  draft: "#8B5CF6", // violet — partial / unconfirmed
  new: "#3B82F6", // blue
  contacted: "#C9A84C", // gold
  call_not_responded: "#F97316", // orange — needs a retry
  booked: "#10b981", // green
  cancelled: "#EF4444", // red
};

// A lead OR employee surfaced as a "call reminder" in the notification bell.
//   due → a scheduled callback whose date+time has arrived
//   new → a fresh, uncontacted lead with no scheduled callback
export type ReminderKind = "due" | "new";

export interface CallReminder {
  id: string;
  name: string | null;
  phone: string | null;
  reason: string;
  kind: ReminderKind;
  /** Detail-page URL — `/admin/<id>` for leads, `/admin/employees/<id>` for employees. */
  href: string;
}
