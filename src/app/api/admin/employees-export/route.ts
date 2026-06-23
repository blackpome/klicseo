import { NextRequest, NextResponse } from "next/server";
import { currentAdmin, resolveScope } from "@/lib/admin-auth";
import { listEmployees } from "@/lib/employees";

// Employees export — full or date-range. Mirrors leads-export. The PDF format
// returns printable HTML that auto-prints; "Save as PDF" via browser does the
// actual PDF conversion (no PDF-gen library). Admin-gated.

export const dynamic = "force-dynamic";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const CSV_COLUMNS: { key: string; label: string }[] = [
  { key: "created_at", label: "Created at" },
  { key: "status", label: "Status" },
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "job_role", label: "Job role" },
  { key: "location", label: "Location" },
  { key: "salary", label: "Salary" },
  { key: "joining_date", label: "Joining date" },
  { key: "resignation_date", label: "Resignation date" },
  { key: "reminder_call_date", label: "Reminder call date" },
  { key: "aadhaar_number", label: "Aadhaar #" },
  { key: "terms_accepted_at", label: "Terms accepted at" },
  { key: "notes", label: "Notes" },
];

// Detailed PDF: every CSV field grouped into readable sections per employee.
const PDF_SECTIONS: { label: string; fields: { key: string; label: string }[] }[] = [
  {
    label: "Employee",
    fields: [
      { key: "created_at", label: "Created at" },
      { key: "status", label: "Status" },
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
    ],
  },
  {
    label: "Role",
    fields: [
      { key: "job_role", label: "Job role" },
      { key: "location", label: "Location" },
      { key: "salary", label: "Salary" },
    ],
  },
  {
    label: "Dates",
    fields: [
      { key: "joining_date", label: "Joining date" },
      { key: "resignation_date", label: "Resignation date" },
      { key: "reminder_call_date", label: "Reminder call date" },
      { key: "terms_accepted_at", label: "Terms accepted at" },
    ],
  },
  {
    label: "Identity & notes",
    fields: [
      { key: "aadhaar_number", label: "Aadhaar #" },
      { key: "notes", label: "Notes" },
    ],
  },
];

export async function GET(req: NextRequest) {
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = me.role === "super_admin" || me.permissions.includes("employees.view");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = req.nextUrl.searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const format = (params.get("format") ?? "csv").toLowerCase();

  const fromIso = ISO_DAY.test(from) ? `${from}T00:00:00+05:30` : undefined;
  const toIso = ISO_DAY.test(to) ? `${to}T23:59:59+05:30` : undefined;

  // Scope: non-super-admins only get their assigned employees in the export.
  const scope = (await resolveScope(me)) ?? { kind: "all" as const };
  const assignedAdminUserId = scope.kind === "assigned" ? scope.adminUserId : undefined;

  const employees = await listEmployees({ limit: 50000, fromIso, toIso, assignedAdminUserId });
  const stamp = `${from || "all"}_to_${to || "all"}`;

  if (format === "pdf") {
    const html = renderDetailedPrintHtml({
      title: "Employees — detailed export",
      subtitle: rangeLabel(from, to),
      sections: PDF_SECTIONS,
      records: employees.map((e) => rowFromEmployee(e as unknown as Record<string, unknown>)),
      recordTitle: (r) => `${(r.name as string) || "(unnamed)"} — ${(r.phone as string) || "no phone"}`,
    });
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const csv = toCsv(
    CSV_COLUMNS,
    employees.map((e) => rowFromEmployee(e as unknown as Record<string, unknown>)),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="employees-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function rowFromEmployee(e: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const col of CSV_COLUMNS) {
    const v = e[col.key];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[col.key] = JSON.stringify(v);
    } else if (typeof v === "boolean") {
      out[col.key] = v ? "Yes" : "No";
    } else {
      out[col.key] = v ?? "";
    }
  }
  return out;
}

// ----- shared formatters (kept inline to keep route self-contained) --------

function rangeLabel(from: string, to: string): string {
  if (from && to) return `${from} → ${to}`;
  if (from) return `from ${from}`;
  if (to) return `up to ${to}`;
  return "all time";
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /["\n\r,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(
  columns: { key: string; label: string }[],
  rows: Array<Record<string, unknown>>,
): string {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  if (rows.length === 0) return header + "\r\n";
  const lines = [header];
  for (const r of rows) lines.push(columns.map((c) => csvCell(r[c.key])).join(","));
  return lines.join("\r\n");
}

function htmlEscape(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatValueForPdf(key: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (key === "created_at" || key.endsWith("_at")) {
    const d = new Date(String(v));
    if (!isNaN(d.getTime())) {
      return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
    }
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function renderDetailedPrintHtml({
  title,
  subtitle,
  sections,
  records,
  recordTitle,
}: {
  title: string;
  subtitle: string;
  sections: { label: string; fields: { key: string; label: string }[] }[];
  records: Array<Record<string, unknown>>;
  recordTitle: (r: Record<string, unknown>) => string;
}): string {
  const count = records.length;

  const cards = records.length
    ? records
        .map((r, idx) => {
          const sectionHtml = sections
            .map(
              (s) => `
              <section class="grp">
                <h3>${htmlEscape(s.label)}</h3>
                <dl>
                  ${s.fields
                    .map(
                      (f) => `
                    <div class="row">
                      <dt>${htmlEscape(f.label)}</dt>
                      <dd>${htmlEscape(formatValueForPdf(f.key, r[f.key]))}</dd>
                    </div>`,
                    )
                    .join("")}
                </dl>
              </section>`,
            )
            .join("");
          return `
            <article class="card">
              <header>
                <span class="ix">#${idx + 1}</span>
                <h2>${htmlEscape(recordTitle(r))}</h2>
              </header>
              <div class="grid">${sectionHtml}</div>
            </article>`;
        })
        .join("")
    : `<p class="empty">No records in this range.</p>`;

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<title>${htmlEscape(title)} — ${htmlEscape(subtitle)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; margin: 24px; color: #111; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 18px; }
  .toolbar { margin-bottom: 12px; }
  .toolbar button { font-size: 12px; padding: 6px 12px; cursor: pointer; }

  .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px 14px; margin: 0 0 14px; page-break-inside: avoid; }
  .card header { display: flex; align-items: baseline; gap: 8px; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 8px; }
  .card .ix { font-size: 10px; color: #888; font-weight: 600; min-width: 28px; }
  .card h2 { margin: 0; font-size: 13px; font-weight: 700; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; }
  .grp h3 { margin: 0 0 4px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #777; font-weight: 700; }
  dl { margin: 0; }
  .row { display: grid; grid-template-columns: 110px 1fr; gap: 6px; padding: 2px 0; font-size: 11px; align-items: start; }
  dt { color: #666; }
  dd { margin: 0; word-break: break-word; }

  .empty { text-align: center; color: #888; padding: 36px 0; }

  @media print {
    .toolbar { display: none; }
    body { margin: 10mm; }
    @page { size: A4 portrait; margin: 10mm; }
    .card { box-shadow: none; }
  }
  @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
</style>
</head><body>
  <div class="toolbar">
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>
  <h1>${htmlEscape(title)}</h1>
  <div class="meta">${htmlEscape(subtitle)} · ${count} record${count === 1 ? "" : "s"} · generated ${htmlEscape(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }))}</div>
  ${cards}
  <script>
    window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 250); });
  </script>
</body></html>`;
}
