"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-auth";
import { setBookingConfig, getSiteSettings, bumpServiceRadius } from "@/lib/site-settings";
import { BOOKING_STEP_DEFS, MESSAGE_DEFS, STEP_FLAG_DEFS, normalizeField, isServiceRadiusKey, type BookingConfig, type BookingStepKey, type CustomField } from "@/lib/site-settings-shared";
import { logAudit } from "@/lib/audit";

function parseFields(raw: string): CustomField[] {
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map(normalizeField).filter((f): f is CustomField => f !== null);
  } catch {
    return [];
  }
}

function parseBuiltins(raw: string): Record<string, { enabled: boolean; required: boolean }> {
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return {};
    const out: Record<string, { enabled: boolean; required: boolean }> = {};
    for (const [k, v] of Object.entries(obj as Record<string, { enabled?: unknown; required?: unknown }>)) {
      out[k] = { enabled: !!v?.enabled, required: !!v?.required };
    }
    return out;
  } catch {
    return {};
  }
}

async function requireManager() {
  const me = await currentAdmin();
  if (!me) throw new Error("Unauthorized");
  if (me.role !== "super_admin" && me.role !== "admin") throw new Error("Forbidden");
}

export async function saveBookingAction(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  try {
    await requireManager();
    const booking = {} as BookingConfig;
    for (const s of BOOKING_STEP_DEFS) {
      const messages: Record<string, string> = {};
      for (const m of MESSAGE_DEFS[s.key] ?? []) {
        const val = String(formData.get(`step_${s.key}_msg_${m.key}`) ?? "").trim();
        if (val) messages[m.key] = val;
      }
      const flags: Record<string, boolean> = {};
      for (const f of STEP_FLAG_DEFS[s.key] ?? []) {
        // Hidden input always submits "true" or "false" — toggle component
        // updates it on click. Missing = use the default.
        const raw = formData.get(`step_${s.key}_flag_${f.key}`);
        if (raw === "true" || raw === "false") flags[f.key] = raw === "true";
      }
      booking[s.key] = {
        title: String(formData.get(`step_${s.key}_title`) ?? "").trim(),
        subtitle: s.editableSubtitle ? String(formData.get(`step_${s.key}_subtitle`) ?? "").trim() : "",
        fields: parseFields(String(formData.get(`step_${s.key}_fields`) ?? "")),
        builtins: parseBuiltins(String(formData.get(`step_${s.key}_builtins`) ?? "")),
        messages,
        flags,
      };
    }
    // Snapshot per-step diffs so the audit log shows exactly which step text /
    // flags / fields changed.
    const before = (await getSiteSettings()).booking;
    await setBookingConfig(booking);
    await logAudit("booking.save", {
      entity: "booking",
      summary: "Updated booking wizard config",
      before: before as unknown as Record<string, unknown>,
      after: booking as unknown as Record<string, unknown>,
    });
    revalidatePath("/", "layout");
    revalidatePath("/booking");
    revalidatePath("/admin/booking");
    return { ok: "Saved." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn’t save." };
  }
}

/**
 * Bump a service's serviceability radius by ±delta km. Returns the new value
 * so the client can update the displayed number without a full refresh.
 */
export async function bumpRadiusAction(service: string, deltaKm: number): Promise<{ ok?: boolean; value?: number; error?: string }> {
  try {
    await requireManager();
    if (!isServiceRadiusKey(service)) return { error: "Unknown service." };
    const beforeRadius = (await getSiteSettings()).serviceRadius[service] ?? null;
    const next = await bumpServiceRadius(service, deltaKm);
    await logAudit("settings.radius", {
      entity: "booking",
      entityId: service,
      summary: `Radius for ${service} → ${next} km`,
      before: { radius_km: beforeRadius },
      after: { radius_km: next },
    });
    revalidatePath("/", "layout");
    revalidatePath("/booking");
    revalidatePath("/admin/booking");
    return { ok: true, value: next };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn’t update radius." };
  }
}

// Reset a single step back to its built-in defaults (clears title/subtitle,
// messages, custom fields, and built-in toggles for that step only).
export async function resetBookingStepAction(stepKey: string): Promise<void> {
  await requireManager();
  if (!BOOKING_STEP_DEFS.some((s) => s.key === stepKey)) return;
  const booking = (await getSiteSettings()).booking;
  const beforeStep = booking[stepKey as BookingStepKey];
  booking[stepKey as BookingStepKey] = { title: "", subtitle: "", fields: [], builtins: {}, messages: {} };
  await setBookingConfig(booking);
  await logAudit("booking.reset", {
    entity: "booking",
    entityId: stepKey,
    summary: `Reset booking step "${stepKey}"`,
    before: beforeStep as unknown as Record<string, unknown>,
    after: booking[stepKey as BookingStepKey] as unknown as Record<string, unknown>,
  });
  revalidatePath("/", "layout");
  revalidatePath("/booking");
  revalidatePath("/admin/booking");
}
