import "server-only";
import { cache } from "react";
import { supabase } from "./supabase";

// Resolve a pincode → locality name via the pincode_areas lookup table. The
// table is small + stable, so React-cache the full map per-request rather
// than running a query per lead.

const PIN_REGEX = /^\d{6}$/;

interface PincodeAreaRow {
  pincode: string;
  area: string;
}

const loadPincodeMap = cache(async (): Promise<Map<string, string>> => {
  const m = new Map<string, string>();
  try {
    const { data } = await supabase().from("pincode_areas").select("pincode,area");
    for (const r of (data ?? []) as PincodeAreaRow[]) m.set(r.pincode, r.area);
  } catch {
    // best-effort — unknown pincodes simply don't auto-derive
  }
  return m;
});

export async function areaFromPincode(pincode: string | null | undefined): Promise<string | null> {
  if (!pincode) return null;
  const p = String(pincode).trim();
  if (!PIN_REGEX.test(p)) return null;
  const map = await loadPincodeMap();
  return map.get(p) ?? null;
}

/** Distinct areas + lead counts, for the filter pill bar on /admin. */
export async function listAreasWithCounts(): Promise<Array<{ area: string; count: number }>> {
  const { data, error } = await supabase().from("leads").select("area").not("area", "is", null);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const r of (data ?? []) as { area: string | null }[]) {
    if (!r.area) continue;
    counts.set(r.area, (counts.get(r.area) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area));
}

/** Canonical area list from the lookup table — used for autocomplete suggestions
 *  on the lead form even before any lead has been tagged with that area. */
export async function listKnownAreas(): Promise<string[]> {
  const map = await loadPincodeMap();
  return Array.from(new Set(map.values())).sort((a, b) => a.localeCompare(b));
}
