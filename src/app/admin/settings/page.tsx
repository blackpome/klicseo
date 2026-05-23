import { redirect } from "next/navigation";
import { Settings2, Download, FileDown } from "lucide-react";
import AdminShell from "../AdminShell";
import { currentAdmin } from "@/lib/admin-auth";
import { getSiteSettings } from "@/lib/site-settings";
import { EXPORT_TABLES } from "@/lib/export";
import SiteSettingsForm from "./SiteSettingsForm";
import MediaManager from "./MediaManager";

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
        <MediaManager media={settings.media} />

        {/* Data export */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3 max-w-lg">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">Export data</h2>
            <p className="text-[11px] text-white/35">Download a backup of your data as CSV files.</p>
          </div>

          <a
            href="/api/admin/export"
            download
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#050E21]"
            style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
          >
            <Download size={16} /> Download all (ZIP)
          </a>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1.5">Or a single table (CSV)</p>
            <div className="flex flex-wrap gap-2">
              {EXPORT_TABLES.map((t) => (
                <a
                  key={t}
                  href={`/api/admin/export?table=${t}`}
                  download
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/15"
                >
                  <FileDown size={13} /> {t}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
