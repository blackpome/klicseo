import { redirect } from "next/navigation";
import Link from "next/link";
import { Car, Plus } from "lucide-react";
import AdminShell from "../AdminShell";
import AdminError from "../AdminError";
import { currentAdmin } from "@/lib/admin-auth";
import { listCars, listAllCars } from "@/lib/cars";
import type { CarRecord } from "@/lib/carPricing";
import CarsTable from "./CarsTable";

export default async function CarsPage({
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
          <p className="text-white/45 text-sm">Only admins can manage cars.</p>
        </div>
      </AdminShell>
    );
  }

  const { q } = await searchParams;

  // No search → full catalog, grouped by monthly price. Searching → flat results.
  const grouped = !q?.trim();
  let cars: CarRecord[] = [];
  let error: unknown = null;
  try {
    cars = grouped ? await listAllCars() : await listCars({ search: q });
  } catch (err) {
    error = err;
  }

  return (
    <AdminShell>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/25">
              <Car className="text-[#C9A84C]" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>Cars & pricing</h1>
              <p className="text-white/45 text-sm">Add or edit cars and their prices. Select multiple to set a group price.</p>
            </div>
          </div>
          <Link
            href="/admin/cars/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[#050E21]"
            style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
          >
            <Plus size={16} /> Add car
          </Link>
        </div>

        <form className="flex gap-2 items-center">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search brand or model…"
            className="flex-1 max-w-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
          <button className="text-xs px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15">Search</button>
        </form>

        {error ? (
          <AdminError err={error} />
        ) : (
          <>
            <p className="text-xs text-white/35">
              {q
                ? `${cars.length} match${cars.length === 1 ? "" : "es"}`
                : `${cars.length} cars · grouped by monthly price (5+ cars share a price)`}
            </p>
            <CarsTable cars={cars} grouped={grouped} />
          </>
        )}
      </div>
    </AdminShell>
  );
}
