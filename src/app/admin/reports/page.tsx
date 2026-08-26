import { redirect } from "next/navigation";
import AdminShell from "../AdminShell";
import DailyReportsClient from "./DailyReportsClient";
import { currentAdmin, resolveScope } from "@/lib/admin-auth";
import { getDailyStaffReport } from "@/lib/reports";

export default async function DailyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const me = await currentAdmin();
  if (!me || !me.permissions.includes("leads.view")) {
    redirect("/admin");
  }

  const scope = (await resolveScope(me)) ?? { kind: "all" as const };
  const isScopedStaff = scope.kind === "assigned";
  const { date, startDate, endDate } = await searchParams;

  const initialSummary = await getDailyStaffReport({
    date,
    startDate,
    endDate,
    assignedAdminUserId: isScopedStaff ? scope.adminUserId : undefined,
  });

  return (
    <AdminShell require="leads.view">
      <DailyReportsClient
        initialSummary={initialSummary}
        currentUserRole={me.role}
        isScopedStaff={isScopedStaff}
        currentUserEmail={me.email}
      />
    </AdminShell>
  );
}
