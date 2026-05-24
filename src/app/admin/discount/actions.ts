"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-auth";
import { setServiceDiscount, getDiscountConfig } from "@/lib/discounts";
import { logAudit } from "@/lib/audit";

async function requireManager() {
  const me = await currentAdmin();
  if (!me) throw new Error("Unauthorized");
  if (me.role !== "super_admin" && me.role !== "admin") throw new Error("Forbidden");
}

// Save one price line's discount. Addressed by service_price_lines.id so it
// works for both legacy lines and admin-created ones.
export async function saveDiscountAction(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  try {
    await requireManager();
    const lineId = String(formData.get("line_id") ?? "");
    const label = String(formData.get("label") ?? "this line");
    if (!lineId) return { error: "Invalid line." };

    const raw = String(formData.get("percent") ?? "").trim();
    const pct = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return { error: "Enter 0–100." };
    }

    const badgeEnabled = String(formData.get("badge") ?? "") === "on";
    // Snapshot before/after so the audit row carries the precise change.
    const cfg = await getDiscountConfig();
    const before = {
      discount_percent: cfg.percentsByLineId[lineId] ?? 0,
      badge_enabled: cfg.badgesByLineId[lineId] ?? true,
    };
    await setServiceDiscount(lineId, pct, badgeEnabled);
    await logAudit("discount.save", {
      entity: "discount",
      entityId: lineId,
      summary: `${label} → ${pct}%${badgeEnabled ? "" : " (badge off)"}`,
      before,
      after: { discount_percent: pct, badge_enabled: badgeEnabled },
    });

    revalidatePath("/", "layout");
    revalidatePath("/admin/discount");
    return {
      ok: pct === 0
        ? "Saved — no discount"
        : `Saved at ${pct}%${badgeEnabled ? "" : " (badge hidden)"}`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn’t save." };
  }
}
