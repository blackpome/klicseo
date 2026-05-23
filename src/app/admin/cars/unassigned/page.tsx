import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Car as CarIcon } from "lucide-react";
import AdminShell from "../../AdminShell";
import AdminError from "../../AdminError";
import { currentAdmin } from "@/lib/admin-auth";
import { listUnassignedCars } from "@/lib/cars";
import { listTiersWithCounts, type PriceTier } from "@/lib/priceTiers";
import type { CarRecord } from "@/lib/carPricing";
import UnassignedPanel from "./UnassignedPanel";

export const dynamic = "force-dynamic";

export default async function UnassignedCarsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
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

  const { q } = await searchParams;
  let cars: CarRecord[] = [];
  let tiers: PriceTier[] = [];
  let error: unknown = null;
  try {
    [cars, tiers] = await Promise.all([listUnassignedCars(q), listTiersWithCounts()]);
  } catch (err) {
    error = err;
  }

  return (
    <AdminShell>
      <div className="space-y-5">
        <Link href="/admin/cars" className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
          <ArrowLeft size={13} /> Back to tiers
        </Link>

        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/25">
            <CarIcon className="text-[#C9A84C]" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>Cars without a tier</h1>
            <p className="text-white/45 text-sm">Pick a tier to assign each car to.</p>
          </div>
        </div>

        {error ? <AdminError err={error} /> : <UnassignedPanel cars={cars} tiers={tiers} search={q ?? ""} />}
      </div>
    </AdminShell>
  );
}
