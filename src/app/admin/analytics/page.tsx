import { redirect } from "next/navigation";
import AdminShell from "../AdminShell";
import AnalyticsDashboardClient from "./AnalyticsDashboardClient";
import { currentAdmin, resolveScope } from "@/lib/admin-auth";
import { getAnalyticsReportData } from "@/lib/analytics";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    area?: string;
    staff?: string;
    service?: string;
    folder?: string;
    source?: string;
  }>;
}) {
  const me = await currentAdmin();
  if (!me || !me.permissions.includes("leads.view")) {
    redirect("/admin");
  }
  // Staff are restricted from viewing company-wide analytics; redirect to their personal daily reports
  if (me.role === "staff") {
    redirect("/admin/reports");
  }

  const { year, area, staff, service, folder, source } = await searchParams;
  const scope = (await resolveScope(me)) ?? { kind: "all" as const };
  const effectiveStaff = scope.kind === "assigned" ? scope.adminUserId : staff;

  const data = await getAnalyticsReportData({
    year,
    area,
    assignedAdminUserId: effectiveStaff,
    service,
    folder,
    source,
  });

  return (
    <AdminShell require="leads.view">
      <AnalyticsDashboardClient
        initialData={data}
        currentUserRole={me.role}
        isScopedStaff={scope.kind === "assigned"}
      />
    </AdminShell>
  );
}
