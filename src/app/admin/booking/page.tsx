import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import AdminShell from "../AdminShell";
import { currentAdmin } from "@/lib/admin-auth";
import { getSiteSettings } from "@/lib/site-settings";
import { getServiceCatalog } from "@/lib/serviceCatalog";
import BookingForm from "./BookingForm";

export default async function BookingAdminPage() {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  if (me.role !== "super_admin" && me.role !== "admin") {
    return (
      <AdminShell>
        <div className="mx-auto max-w-md text-center py-24">
          <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-playfair)" }}>No access</h1>
          <p className="text-white/45 text-sm">Only admins can manage the booking wizard.</p>
        </div>
      </AdminShell>
    );
  }

  const [settings, catalog] = await Promise.all([getSiteSettings(), getServiceCatalog()]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/25">
            <ClipboardList className="text-[#C9A84C]" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>Booking wizard</h1>
            <p className="text-white/45 text-sm">
              Control each step of the booking flow. Step text first — more controls (options, fields, serviceability) come per step.
            </p>
          </div>
        </div>

        <BookingForm current={settings.booking} serviceRadius={settings.serviceRadius} catalog={catalog} />
      </div>
    </AdminShell>
  );
}
