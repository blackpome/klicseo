import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";

// Date-range CSV export for audit_logs.
//
//   GET /api/admin/audit-export?from=YYYY-MM-DD&to=YYYY-MM-DD&entity=lead&q=…
//
// All params optional. `from`/`to` are inclusive day boundaries in IST.
// Admin-gated.

export const dynamic = "force-dynamic";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "super_admin" && me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const from = req.nextUrl.searchParams.get("from") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  const entity = req.nextUrl.searchParams.get("entity") ?? "";
  const q = req.nextUrl.searchParams.get("q") ?? "";

  let query = supabase().from("audit_logs").select("*").order("created_at", { ascending: false }).limit(20000);
  if (ISO_DAY.test(from)) query = query.gte("created_at", `${from}T00:00:00+05:30`);
  if (ISO_DAY.test(to))   query = query.lte("created_at", `${to}T23:59:59+05:30`);
  if (entity && entity !== "all") query = query.eq("entity", entity);
  if (q.trim()) {
    const s = q.replace(/[,()"'\\*%]/g, " ").trim();
    if (s) query = query.or(`actor_email.ilike.%${s}%,summary.ilike.%${s}%,action.ilike.%${s}%,entity_id.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    created_at: string;
    actor_email: string | null;
    actor_role: string | null;
    action: string;
    entity: string | null;
    entity_id: string | null;
    summary: string | null;
    metadata: Record<string, unknown> | null;
  };
  const rows = ((data ?? []) as Row[]).map((r) => ({
    When: r.created_at,
    Who: r.actor_email ?? "",
    Role: r.actor_role ?? "",
    Action: r.action,
    Entity: r.entity ?? "",
    "Entity ID": r.entity_id ?? "",
    Summary: r.summary ?? "",
    Diff: r.metadata?.diff ? JSON.stringify(r.metadata.diff) : "",
    Before: r.metadata?.before ? JSON.stringify(r.metadata.before) : "",
    After: r.metadata?.after ? JSON.stringify(r.metadata.after) : "",
  }));

  const csv = toCsv(rows);
  const stamp = `${from || "all"}_to_${to || "all"}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-logs-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /["\n\r,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "When,Who,Role,Action,Entity,Entity ID,Summary,Diff,Before,After\r\n";
  const headers = Array.from(
    rows.reduce<Set<string>>((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set()),
  );
  const lines = [headers.map(csvCell).join(",")];
  for (const r of rows) lines.push(headers.map((h) => csvCell(r[h])).join(","));
  return lines.join("\r\n");
}
