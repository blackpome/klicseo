import "server-only";
import JSZip from "jszip";
import { supabase } from "./supabase";

// Tables included in a full export.
export const EXPORT_TABLES = [
  "leads",
  "payments",
  "employees",
  "cars",
  "jobs",
  "service_discounts",
  "app_settings",
  "admin_users",
  "audit_logs",
] as const;
export type ExportTable = (typeof EXPORT_TABLES)[number];

export function isExportTable(v: string): v is ExportTable {
  return (EXPORT_TABLES as readonly string[]).includes(v);
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/["\n\r,]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce<Set<string>>((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set()),
  );
  const lines = [headers.map(csvCell).join(",")];
  for (const r of rows) lines.push(headers.map((h) => csvCell(r[h])).join(","));
  return lines.join("\r\n");
}

async function fetchTable(table: ExportTable): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase().from(table).select("*").limit(100000);
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

/** CSV for a single table. */
export async function tableCsv(table: ExportTable): Promise<string> {
  return toCsv(await fetchTable(table));
}

/** ZIP containing one CSV per table. Missing tables become empty files. */
export async function exportZip(): Promise<Buffer> {
  const zip = new JSZip();
  for (const t of EXPORT_TABLES) {
    try {
      zip.file(`${t}.csv`, await tableCsv(t));
    } catch {
      zip.file(`${t}.csv`, ""); // table may not be provisioned yet
    }
  }
  return zip.generateAsync({ type: "nodebuffer" });
}
