import { redirect } from "next/navigation";
import { Settings2 } from "lucide-react";
import AdminShell from "../AdminShell";
import { currentAdmin } from "@/lib/admin-auth";
import { getSiteSettings } from "@/lib/site-settings";
import SiteSettingsForm from "./SiteSettingsForm";

export default async function SiteSettingsPage() {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  if (me.role !== "super_admin" && me.role !== "admin") {
    return (
      <AdminShell>
        <div className="mx-auto max-w-md text-center py-24">
          <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-playfair)" }}>No access</h1>
          <p className="text-white/45 text-sm">Only admins can manage site settings.</p>
        </div>
      </AdminShell>
    );
  }

  const settings = await getSiteSettings();

  return (
    <AdminShell>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/25">
            <Settings2 className="text-[#C9A84C]" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>Site settings</h1>
            <p className="text-white/45 text-sm">
              The starting price and contact numbers shown across the website.
            </p>
          </div>
        </div>

        <SiteSettingsForm current={settings} />
      </div>
    </AdminShell>
  );
}
