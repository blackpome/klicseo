import { redirect } from "next/navigation";
import { Tag } from "lucide-react";
import AdminShell from "../AdminShell";
import AdminError from "../AdminError";
import { currentAdmin } from "@/lib/admin-auth";
import { listTiersWithCounts, type PriceTier } from "@/lib/priceTiers";
import { listUnassignedCars } from "@/lib/cars";
import type { CarRecord } from "@/lib/carPricing";
import TiersBoard from "./TiersBoard";

export const dynamic = "force-dynamic";

export default async function CarsPage() {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  if (me.role !== "super_admin" && me.role !== "admin") {
    return (
      <AdminShell>
        <div className="mx-auto max-w-md text-center py-24">
          <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-playfair)" }}>No access</h1>
          <p className="text-white/45 text-sm">Only admins can manage pricing.</p>
        </div>
      </AdminShell>
    );
  }

  let tiers: PriceTier[] = [];
  let unassigned: CarRecord[] = [];
  let error: unknown = null;
  try {
    [tiers, unassigned] = await Promise.all([listTiersWithCounts(), listUnassignedCars()]);
  } catch (err) {
    error = err;
  }

  return (
    <AdminShell>
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/25">
            <Tag className="text-[#C9A84C]" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>Pricing tiers</h1>
            <p className="text-white/45 text-sm">Each tier is one row of prices. Add cars to a tier — editing the tier updates every car in it.</p>
          </div>
        </div>

        {error ? <AdminError err={error} /> : <TiersBoard tiers={tiers} unassignedCount={unassigned.length} />}
      </div>
    </AdminShell>
  );
}
