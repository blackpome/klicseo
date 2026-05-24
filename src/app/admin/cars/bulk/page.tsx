import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sheet as SheetIcon } from "lucide-react";
import AdminShell from "../../AdminShell";
import { currentAdmin } from "@/lib/admin-auth";
import { listTiersWithCounts, getTier } from "@/lib/priceTiers";
import { listAllCars } from "@/lib/cars";
import BulkCarsSheet from "./BulkCarsSheet";

export const dynamic = "force-dynamic";

export default async function BulkAddCarsPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  if (me.role !== "super_admin" && me.role !== "admin") redirect("/admin");

  const { tier: tierParam } = await searchParams;
  const [tiers, defaultTier, catalog] = await Promise.all([
    listTiersWithCounts(),
    tierParam ? getTier(tierParam) : Promise.resolve(null),
    // Used only for the in-cell autocomplete suggestions; just the brand+model
    // pairs we care about (limit kept generous for typical catalogs).
    listAllCars(2000),
  ]);
  const existingCars = catalog.map((c) => ({ brand: c.brand, model: c.model }));
  const defaultTierId = defaultTier ? defaultTier.id : "";
  const backHref = defaultTier ? `/admin/cars/tier/${defaultTier.id}` : "/admin/cars";
  const backLabel = defaultTier ? `Back to ${defaultTier.name}` : "Back to tiers";

  return (
    <AdminShell>
      <div className="space-y-5">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
          <ArrowLeft size={13} /> {backLabel}
        </Link>

        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/25">
            <SheetIcon className="text-[#C9A84C]" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>Bulk add cars</h1>
            <p className="text-white/45 text-sm">
              Sheet-style entry. Paste rows from Excel or type one at a time — duplicates against the catalog are flagged inline.
              {defaultTier && (
                <> New rows are pre-assigned to <span className="text-[#E8CC7A] font-semibold">{defaultTier.name}</span>.</>
              )}
            </p>
          </div>
        </div>

        <BulkCarsSheet tiers={tiers} defaultTierId={defaultTierId} existingCars={existingCars} />
      </div>
    </AdminShell>
  );
}
