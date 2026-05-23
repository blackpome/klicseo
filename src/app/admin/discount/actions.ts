"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-auth";
import { isPriceLine, type PriceLine } from "@/lib/pricing";
import { setServiceDiscount } from "@/lib/discounts";
import { logAudit } from "@/lib/audit";

async function requireManager() {
  const me = await currentAdmin();
  if (!me) throw new Error("Unauthorized");
  if (me.role !== "super_admin" && me.role !== "admin") throw new Error("Forbidden");
}

// Save one price line's discount. Used per-row so each line has its own button.
export async function saveDiscountAction(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  try {
    await requireManager();
    const line = String(formData.get("line") ?? "");
    if (!isPriceLine(line)) return { error: "Invalid line." };

    const raw = String(formData.get("percent") ?? "").trim();
    const pct = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return { error: "Enter 0–100." };
    }

    const badgeEnabled = String(formData.get("badge") ?? "") === "on";
    await setServiceDiscount(line as PriceLine, pct, badgeEnabled);
    await logAudit("discount.save", { entity: "discount", entityId: line, summary: `${line} → ${pct}%${badgeEnabled ? "" : " (badge off)"}` });

    // Refresh everything that reads discounts (layout-level provider + pages).
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
