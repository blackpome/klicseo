import "server-only";
import { supabase } from "./supabase";
import { currentAdmin } from "./admin-auth";

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
  // Override the actor when there's no session yet (e.g. login).
  actorEmail?: string;
  actorRole?: string;
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
    await supabase().from("audit_logs").insert({
      actor_email: email,
      actor_role: role,
      action,
      entity: opts.entity ?? null,
      entity_id: opts.entityId ?? null,
      summary: opts.summary ?? null,
      metadata: opts.metadata ?? null,
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
  limit?: number;
} = {}): Promise<AuditLog[]> {
  let q = supabase().from("audit_logs").select("*").order("created_at", { ascending: false });
  if (opts.entity && opts.entity !== "all") q = q.eq("entity", opts.entity);
  if (opts.action) q = q.eq("action", opts.action);
  if (opts.search) {
    const s = opts.search.replace(/[,()"'\\*%]/g, " ").trim();
    if (s) q = q.or(`actor_email.ilike.%${s}%,summary.ilike.%${s}%,action.ilike.%${s}%,entity_id.ilike.%${s}%`);
  }
  q = q.limit(opts.limit ?? 200);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AuditLog[];
}

/** Distinct entity types present, for the filter UI. */
export const AUDIT_ENTITIES = [
  "lead", "payment", "employee", "car", "job", "discount", "settings", "booking", "access", "auth",
] as const;
