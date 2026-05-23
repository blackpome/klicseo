import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin-auth";
import { exportZip, isExportTable, tableCsv } from "@/lib/export";

// GET /api/admin/export            → ZIP of all tables (CSV each)
// GET /api/admin/export?table=leads → single-table CSV
// Admin / super-admin only.
export async function GET(req: NextRequest) {
  const me = await currentAdmin();
  if (!me || (me.role !== "super_admin" && me.role !== "admin")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const table = req.nextUrl.searchParams.get("table");

  try {
    if (table) {
      if (!isExportTable(table)) return new NextResponse("Unknown table", { status: 400 });
      const csv = await tableCsv(table);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="klicseo-${table}-${stamp}.csv"`,
        },
      });
    }

    const zip = await exportZip();
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="klicseo-export-${stamp}.zip"`,
      },
    });
  } catch (err) {
    console.error("Export failed:", err);
    return new NextResponse("Export failed", { status: 500 });
  }
}
