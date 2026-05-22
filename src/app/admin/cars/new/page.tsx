import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AdminShell from "../../AdminShell";
import { currentAdmin } from "@/lib/admin-auth";
import CarForm from "../CarForm";

export default async function NewCarPage() {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  if (me.role !== "super_admin" && me.role !== "admin") redirect("/admin");

  return (
    <AdminShell>
      <div className="space-y-4">
        <Link href="/admin/cars" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
          <ArrowLeft size={15} /> Cars
        </Link>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>Add car</h1>
        <CarForm />
      </div>
    </AdminShell>
  );
}
