import { redirect } from "next/navigation";
import { Tag } from "lucide-react";
import AdminShell from "../AdminShell";
import { currentAdmin } from "@/lib/admin-auth";
import { getDiscountConfig } from "@/lib/discounts";
import { PRICE_LINE_GROUPS } from "@/lib/pricing";
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

  const { percents, badges } = await getDiscountConfig();

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

        {PRICE_LINE_GROUPS.map((group) => (
          <div key={group.category} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-1">{group.title}</h2>
            <div>
              {group.lines.map((line) => (
                <DiscountRow key={line} line={line} current={percents[line] ?? 0} badge={badges[line] ?? true} />
              ))}
            </div>
          </div>
        ))}

        <p className="text-[11px] text-white/30">
          The toggle shows/hides that line’s “% OFF” badge on the site (the discount still applies to the price).
          Sample prices are Hatchback-tier, only to preview the percentage.
        </p>
      </div>
    </AdminShell>
  );
}
