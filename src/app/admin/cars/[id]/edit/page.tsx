import { notFound, redirect } from "next/navigation";
import AdminShell from "../../../AdminShell";
import AdminBackButton from "@/components/AdminBackButton";
import { currentAdmin } from "@/lib/admin-auth";
import { getCar } from "@/lib/cars";
import { listTiersWithCounts } from "@/lib/priceTiers";
import CarForm from "../../CarForm";

export default async function EditCarPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  if (me.role !== "super_admin" && me.role !== "admin") redirect("/admin");

  const { id } = await params;
  const [car, tiers] = await Promise.all([getCar(id), listTiersWithCounts()]);
  if (!car) notFound();

  return (
    <AdminShell>
      <div className="space-y-4">
        <AdminBackButton fallbackHref="/admin/cars" label="Pricing tiers" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white" iconSize={15} />
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
          {car.brand} {car.model}
        </h1>
        <CarForm car={car} tiers={tiers} />
      </div>
    </AdminShell>
  );
}
