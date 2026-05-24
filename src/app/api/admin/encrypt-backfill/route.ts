import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import { seal, isSealed, phoneHash } from "@/lib/crypto";
import { areaFromPincode } from "@/lib/area";

// One-shot backfill: walks each table and encrypts any field that's still
// stored as plaintext. Idempotent — re-running is a no-op because seal()
// short-circuits on already-sealed values.
//
// Run once after deploying the encryption code. Super-admin only.

export const dynamic = "force-dynamic";

const LEAD_FIELDS = ["phone", "car_number", "address", "map_link", "gate_access_notes", "notes"] as const;
const EMPLOYEE_FIELDS = ["phone", "aadhaar_number", "notes"] as const;

export async function POST() {
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "super_admin") {
    return NextResponse.json({ error: "Super-admin only." }, { status: 403 });
  }

  const sb = supabase();
  const result = {
    leads: { scanned: 0, sealed: 0 },
    employees: { scanned: 0, sealed: 0 },
    payments: { scanned: 0, sealed: 0 },
    audit_logs: { scanned: 0, sealed: 0 },
  };

  // Leads — seal each encrypted column + write phone_hash for exact-match search.
  // Also populate `area` from pincode for legacy rows that don't have one.
  {
    const { data } = await sb.from("leads").select(`id, phone_hash, pincode, area, ${LEAD_FIELDS.join(",")}`);
    for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
      result.leads.scanned++;
      const patch: Record<string, unknown> = {};
      let phonePlaintext: string | null = null;
      for (const f of LEAD_FIELDS) {
        const v = row[f];
        if (typeof v !== "string" || v.length === 0) continue;
        if (f === "phone") phonePlaintext = isSealed(v) ? null : v;
        if (!isSealed(v)) patch[f] = seal(v);
      }
      // Populate phone_hash if it's missing OR if we just encrypted a new phone.
      if (!row.phone_hash && phonePlaintext) patch.phone_hash = phoneHash(phonePlaintext);
      // Populate area from pincode for legacy rows.
      if (!row.area && typeof row.pincode === "string") {
        const derived = await areaFromPincode(row.pincode);
        if (derived) patch.area = derived;
      }
      if (Object.keys(patch).length > 0) {
        await sb.from("leads").update(patch).eq("id", row.id);
        result.leads.sealed++;
      }
    }
  }

  // Employees — same treatment.
  {
    const { data } = await sb.from("employees").select(`id, phone_hash, ${EMPLOYEE_FIELDS.join(",")}`);
    for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
      result.employees.scanned++;
      const patch: Record<string, unknown> = {};
      let phonePlaintext: string | null = null;
      for (const f of EMPLOYEE_FIELDS) {
        const v = row[f];
        if (typeof v !== "string" || v.length === 0) continue;
        if (f === "phone") phonePlaintext = isSealed(v) ? null : v;
        if (!isSealed(v)) patch[f] = seal(v);
      }
      if (!row.phone_hash && phonePlaintext) patch.phone_hash = phoneHash(phonePlaintext);
      if (Object.keys(patch).length > 0) {
        await sb.from("employees").update(patch).eq("id", row.id);
        result.employees.sealed++;
      }
    }
  }

  // Payments
  {
    const { data } = await sb.from("payments").select("id, notes");
    for (const row of (data ?? []) as Array<{ id: string; notes: string | null }>) {
      result.payments.scanned++;
      if (typeof row.notes === "string" && row.notes.length > 0 && !isSealed(row.notes)) {
        await sb.from("payments").update({ notes: seal(row.notes) }).eq("id", row.id);
        result.payments.sealed++;
      }
    }
  }

  // Audit logs — wrap legacy plaintext metadata into the sealed envelope.
  {
    const { data } = await sb.from("audit_logs").select("id, metadata").not("metadata", "is", null);
    for (const row of (data ?? []) as Array<{ id: string; metadata: Record<string, unknown> | null }>) {
      result.audit_logs.scanned++;
      const m = row.metadata;
      if (!m) continue;
      if (typeof (m as { __sealed?: unknown }).__sealed === "string") continue; // already sealed
      await sb.from("audit_logs").update({ metadata: { __sealed: seal(JSON.stringify(m)) } }).eq("id", row.id);
      result.audit_logs.sealed++;
    }
  }

  return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
}
