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
  }>;
}) {
  const me = await currentAdmin();
  if (!me || !me.permissions.includes("leads.view")) {
    redirect("/admin");
  }

  const { year, area, staff, service } = await searchParams;
  const scope = (await resolveScope(me)) ?? { kind: "all" as const };
  const effectiveStaff = scope.kind === "assigned" ? scope.adminUserId : staff;

  const data = await getAnalyticsReportData({
    year,
    area,
    assignedAdminUserId: effectiveStaff,
    service,
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
