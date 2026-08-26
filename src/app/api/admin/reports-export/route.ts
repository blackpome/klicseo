import { NextRequest, NextResponse } from "next/server";
import { currentAdmin, resolveScope } from "@/lib/admin-auth";
import { getDailyStaffReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

function csvEscape(val: unknown): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const me = await currentAdmin();
  if (!me || !me.permissions.includes("leads.view")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const scope = (await resolveScope(me)) ?? { kind: "all" as const };
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const report = await getDailyStaffReport({
    date,
    startDate,
    endDate,
    assignedAdminUserId: scope.kind === "assigned" ? scope.adminUserId : undefined,
  });

  const headers = [
    "Date Period",
    "Staff Name",
    "Staff Email",
    "Role",
    "Total Calls Logged",
    "Booked (Conversions)",
    "Contacted (Connected)",
    "Follow Ups Scheduled",
    "Call Not Responded",
    "Cancelled",
    "Draft",
    "Connectivity Rate %",
    "Conversion Rate %",
    "Total Assigned Leads",
    "Pending Uncalled Leads",
  ];

  const datePeriodLabel = report.isSingleDay
    ? report.date
    : `${report.startDate} to ${report.endDate}`;

  const rows = report.staffMetrics.map((m) => [
    datePeriodLabel,
    m.name,
    m.email,
    m.role,
    m.totalCalls,
    m.bookedCount,
    m.contactedCount,
    m.followUpCount,
    m.notRespondedCount,
    m.cancelledCount,
    m.draftCount,
    `${m.connectivityRate}%`,
    `${m.conversionRate}%`,
    m.totalAssignedLeads,
    m.pendingUncalledLeads,
  ]);

  // Overall totals row
  const totalsRow = [
    datePeriodLabel,
    "OVERALL TOTALS",
    `Active Staff: ${report.activeStaffCount}`,
    "",
    report.totalCalls,
    report.totalBookings,
    report.totalContacted,
    report.totalFollowUps,
    report.totalNotResponded,
    report.totalCancelled,
    "",
    `${report.overallConnectivityRate}%`,
    `${report.overallConversionRate}%`,
    "",
    "",
  ];

  const csvContent =
    "\uFEFF" + // UTF-8 BOM
    [
      headers.map(csvEscape).join(","),
      totalsRow.map(csvEscape).join(","),
      ...rows.map((r) => r.map(csvEscape).join(",")),
    ].join("\r\n");

  const filename = `daily-staff-report-${report.startDate === report.endDate ? report.date : `${report.startDate}_to_${report.endDate}`}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
