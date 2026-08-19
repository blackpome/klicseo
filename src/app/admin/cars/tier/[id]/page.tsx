import { redirect, notFound } from "next/navigation";
import { Tag } from "lucide-react";
import AdminShell from "../../../AdminShell";
import AdminError from "../../../AdminError";
import AdminBackButton from "@/components/AdminBackButton";
import { currentAdmin } from "@/lib/admin-auth";
import { getTier, listTiersWithCounts, type PriceTier } from "@/lib/priceTiers";
import { listCarsByTier } from "@/lib/cars";
import { inr } from "@/lib/pricing";
import type { CarRecord } from "@/lib/carPricing";
import TierCarsPanel from "./TierCarsPanel";

export const dynamic = "force-dynamic";

export default async function TierManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  if (me.role !== "super_admin" && me.role !== "admin") {
    return (
      <AdminShell>
        <div className="mx-auto max-w-md text-center py-24">
          <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-playfair)" }}>No access</h1>
        </div>
      </AdminShell>
    );
  }

  const { id } = await params;
  const tier = await getTier(id);
  if (!tier) notFound();

  let assigned: CarRecord[] = [];
  let allTiers: PriceTier[] = [];
  let error: unknown = null;
  try {
    [assigned, allTiers] = await Promise.all([
      listCarsByTier(id),
      listTiersWithCounts(),
    ]);
  } catch (err) {
    error = err;
  }

  return (
    <AdminShell>
      <div className="space-y-5">
        <AdminBackButton fallbackHref="/admin/cars" label="Back to tiers" className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white" />

        <div className="flex items-start gap-3 flex-wrap">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/25">
            <Tag className="text-[#C9A84C]" size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>{tier.name}</h1>
            <p className="text-white/45 text-sm">
              Monthly {tier.monthly != null ? inr(tier.monthly) : "—"} · Detailing {tier.car_detailing != null ? inr(tier.car_detailing) : "—"}
            </p>
          </div>
        </div>

        {error ? <AdminError err={error} /> : <TierCarsPanel tierId={tier.id} assigned={assigned} allTiers={allTiers} />}
      </div>
    </AdminShell>
  );
}
