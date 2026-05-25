import { redirect } from "next/navigation";
import { Tag, Info } from "lucide-react";
import AdminShell from "../AdminShell";
import { currentAdmin } from "@/lib/admin-auth";
import { getDiscountConfig } from "@/lib/discounts";
import { getServiceCatalog } from "@/lib/serviceCatalog";
import type { CatalogCategory, CatalogPriceLine } from "@/lib/serviceCatalog-shared";
import DiscountRow from "./DiscountRow";

export default async function DiscountPage() {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  if (me.role !== "super_admin" && me.role !== "admin") {
    return (
      <AdminShell>
        <div className="mx-auto max-w-md text-center py-24">
          <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-playfair)" }}>No access</h1>
          <p className="text-white/45 text-sm">Only admins can manage discounts.</p>
        </div>
      </AdminShell>
    );
  }

  const [{ percentsByLineId, badgesByLineId }, catalog] = await Promise.all([
    getDiscountConfig(),
    getServiceCatalog(),
  ]);

  // Every catalog line is shown — legacy or admin-created. Migration 0022
  // ensures a service_discounts row exists for every line via trigger.
  const groups = catalog.categories.map((cat: CatalogCategory) => {
    const lines = catalog.priceLines
      .filter((l) => l.category_id === cat.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    return { cat, lines };
  });

  return (
    <AdminShell>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/25">
            <Tag className="text-[#C9A84C]" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
              Discounts
            </h1>
            <p className="text-white/45 text-sm">
              Set a discount % per service line and save each individually. It applies on top of the list
              price everywhere — website cards, the booking wizard, and what customers are charged.
            </p>
          </div>
        </div>

        {groups.map(({ cat, lines }: { cat: CatalogCategory; lines: CatalogPriceLine[] }) => {
          if (lines.length === 0) return null;
          return (
            <div key={cat.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">{cat.label}</h2>
                {!cat.enabled && (
                  <span className="text-[10px] text-white/35 px-1.5 py-0.5 rounded bg-white/5 ring-1 ring-white/10">hidden</span>
                )}
              </div>
              <div>
                {lines.map((l) => (
                  <DiscountRow
                    key={l.id}
                    lineId={l.id}
                    label={l.label}
                    current={percentsByLineId[l.id] ?? 0}
                    badge={badgesByLineId[l.id] ?? true}
                  />
                ))}
              </div>
            </div>
          );
        })}

        <div className="flex items-start gap-2 rounded-lg border border-[#C9A84C]/20 bg-[#C9A84C]/[0.05] p-2.5 text-[11px] text-white/60 max-w-2xl">
          <Info size={12} className="text-[#C9A84C] shrink-0 mt-0.5" />
          <p>
            Line names come from the Services editor (Booking → Step 1). Rename a sub-category there and it&apos;ll
            appear here. The toggle shows/hides that line&apos;s &ldquo;% OFF&rdquo; badge on the site — the discount still
            applies to the price even when the badge is off.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
