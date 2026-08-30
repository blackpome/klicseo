import "server-only";
import { supabase } from "./supabase";
import { currentAdmin } from "./admin-auth";
import { seal, unseal, isSealed } from "./crypto";

export interface AuditLog {
  id: string;
  created_at: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
}

export interface LogOpts {
  entity?: string;
  entityId?: string | null;
  summary?: string;
  metadata?: Record<string, unknown> | null;
  /** Snapshot of the entity before the change. Plain key/value object; only
   *  the fields that matter need to be included. Will be merged into metadata
   *  under `before`. */
  before?: Record<string, unknown> | null;
  /** Snapshot of the entity after the change. Merged into metadata under `after`. */
  after?: Record<string, unknown> | null;
  // Override the actor when there's no session yet (e.g. login).
  actorEmail?: string;
  actorRole?: string;
}

/**
 * Convert a snake_case DB column to a human-readable label, with overrides
 * for fields whose generic title-case doesn't read naturally.
 */
const FIELD_LABEL_OVERRIDES: Record<string, string> = {
  service_option: "Service",
  price_total: "Total price",
  discount_percent: "Discount %",
  callback_date: "Follow-up date",
  callback_time: "Follow-up time",
  car_brand: "Car brand",
  car_model: "Car model",
  car_number: "Car number",
  car_cover_choice: "Car cover",
  parking_location: "Parking",
  gate_access_consent: "Gate access consent",
  gate_access_notes: "Gate access notes",
  interior_add_on: "Interior add-on",
  job_role: "Job role",
  joining_date: "Joining date",
  resignation_date: "Resignation date",
  reminder_call_date: "Reminder call date",
  aadhaar_number: "Aadhaar",
  aadhaar_photo_path: "Aadhaar photo",
  profile_photo_path: "Profile photo",
  paid_at: "Paid date",
  paymentReminder: "Payment reminder template",
  paymentThanks: "Payment thanks template",
  paymentManual: "Manual chat greeting",
};

export function humaniseField(field: string): string {
  if (FIELD_LABEL_OVERRIDES[field]) return FIELD_LABEL_OVERRIDES[field];
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Diff helper: returns the keys where before !== after, with both values. */
export function diffSnapshots(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const k of keys) {
    const a = (before ?? {})[k];
    const b = (after ?? {})[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) out[k] = { from: a, to: b };
  }
  return out;
}

// Record an admin action. Never throws — logging must not break the action.
export async function logAudit(action: string, opts: LogOpts = {}): Promise<void> {
  try {
    let email = opts.actorEmail ?? null;
    let role: string | null = opts.actorRole ?? null;
    if (!email) {
      const me = await currentAdmin();
      email = me?.email ?? null;
      role = me?.role ?? null;
    }
    // Roll any before/after snapshot + computed diff into metadata so the
    // audit row carries the change history alongside the action.
    const meta: Record<string, unknown> = { ...(opts.metadata ?? {}) };
    let summary = opts.summary ?? null;
    if (opts.before || opts.after) {
      meta.before = opts.before ?? null;
      meta.after = opts.after ?? null;
      const diff = diffSnapshots(opts.before, opts.after);
      meta.diff = diff;
      // Append a short list of the changed fields to the summary so even a
      // one-line audit log row shows what was edited at a glance.
      const fields = Object.keys(diff);
      if (fields.length > 0) {
        const humanised = fields.map(humaniseField).join(", ");
        const suffix = `Changed: ${humanised}`;
        summary = summary ? `${summary} — ${suffix}` : suffix;
      }
    }
    // Seal the metadata blob before storage so the before/after snapshots
    // (which may contain decrypted PII) aren't readable from a DB dump.
    const metaToStore = Object.keys(meta).length > 0
      ? { __sealed: seal(JSON.stringify(meta)) }
      : null;
    await supabase().from("audit_logs").insert({
      actor_email: email,
      actor_role: role,
      action,
      entity: opts.entity ?? null,
      entity_id: opts.entityId ?? null,
      summary,
      metadata: metaToStore,
    });
    // Self-maintaining retention: occasionally prune so old rows clear out
    // during normal usage even if no one opens the logs page.
    if (Math.random() < 0.03) await pruneOldAuditLogs();
  } catch {
    // swallow — auditing is best-effort
  }
}

const RETENTION_MONTHS = 6;

/** Delete audit entries older than the retention window (default 6 months). */
export async function pruneOldAuditLogs(months = RETENTION_MONTHS): Promise<void> {
  try {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    await supabase().from("audit_logs").delete().lt("created_at", cutoff.toISOString());
  } catch {
    // best-effort
  }
}

export async function listAuditLogs(opts: {
  search?: string;
  action?: string;
  entity?: string;
  /** Inclusive day boundary in YYYY-MM-DD (interpreted in IST). */
  from?: string;
  to?: string;
  limit?: number;
} = {}): Promise<AuditLog[]> {
  let q = supabase().from("audit_logs").select("*").order("created_at", { ascending: false });
  if (opts.entity && opts.entity !== "all") q = q.eq("entity", opts.entity);
  if (opts.action) q = q.eq("action", opts.action);
  if (opts.from && /^\d{4}-\d{2}-\d{2}$/.test(opts.from)) q = q.gte("created_at", `${opts.from}T00:00:00+05:30`);
  if (opts.to   && /^\d{4}-\d{2}-\d{2}$/.test(opts.to))   q = q.lte("created_at", `${opts.to}T23:59:59+05:30`);
  if (opts.search) {
    const s = opts.search.replace(/[,()"'\\*%]/g, " ").trim();
    if (s) q = q.or(`actor_email.ilike.%${s}%,summary.ilike.%${s}%,action.ilike.%${s}%,entity_id.ilike.%${s}%`);
  }
  q = q.limit(opts.limit ?? 200);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as AuditLog[]).map(unsealAuditMetadata);
}

/** If the audit row's metadata is sealed (encrypted JSON blob), decrypt and
 *  re-hydrate it. Tolerates legacy plaintext rows transparently. */
function unsealAuditMetadata(row: AuditLog): AuditLog {
  const m = row.metadata as { __sealed?: unknown } | null;
  if (m && isSealed(m.__sealed)) {
    try {
      const json = unseal(m.__sealed as string);
      const parsed = json ? (JSON.parse(json) as Record<string, unknown>) : null;
      return { ...row, metadata: parsed };
    } catch {
      // Corrupted ciphertext (key rotated, value tampered) — keep the row but
      // surface a marker so investigations don't silently miss it.
      return { ...row, metadata: { __decrypt_error: true } as Record<string, unknown> };
    }
  }
  return row;
}

/** Distinct entity types present, for the filter UI. */
export const AUDIT_ENTITIES = [
  "lead", "payment", "employee", "car", "job", "discount", "settings", "booking", "access", "auth",
] as const;
