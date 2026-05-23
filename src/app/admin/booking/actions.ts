"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-auth";
import { setBookingConfig, getSiteSettings } from "@/lib/site-settings";
import { BOOKING_STEP_DEFS, MESSAGE_DEFS, normalizeField, type BookingConfig, type BookingStepKey, type CustomField } from "@/lib/site-settings-shared";
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
      booking[s.key] = {
        title: String(formData.get(`step_${s.key}_title`) ?? "").trim(),
        subtitle: s.editableSubtitle ? String(formData.get(`step_${s.key}_subtitle`) ?? "").trim() : "",
        fields: parseFields(String(formData.get(`step_${s.key}_fields`) ?? "")),
        builtins: parseBuiltins(String(formData.get(`step_${s.key}_builtins`) ?? "")),
        messages,
      };
    }
    await setBookingConfig(booking);
    await logAudit("booking.save", { entity: "booking", summary: "Updated booking wizard config" });
    revalidatePath("/", "layout");
    revalidatePath("/booking");
    revalidatePath("/admin/booking");
    return { ok: "Saved." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn’t save." };
  }
}

// Reset a single step back to its built-in defaults (clears title/subtitle,
// messages, custom fields, and built-in toggles for that step only).
export async function resetBookingStepAction(stepKey: string): Promise<void> {
  await requireManager();
  if (!BOOKING_STEP_DEFS.some((s) => s.key === stepKey)) return;
  const booking = (await getSiteSettings()).booking;
  booking[stepKey as BookingStepKey] = { title: "", subtitle: "", fields: [], builtins: {}, messages: {} };
  await setBookingConfig(booking);
  await logAudit("booking.reset", { entity: "booking", entityId: stepKey, summary: `Reset booking step "${stepKey}"` });
  revalidatePath("/", "layout");
  revalidatePath("/booking");
  revalidatePath("/admin/booking");
}
