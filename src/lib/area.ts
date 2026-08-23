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

const DEFAULT_KNOWN_AREAS = [
  "Adambakkam",
  "Adyar",
  "Alwarpet",
  "Ambattur",
  "Ambattur Industrial Estate",
  "Ambattur OT",
  "Aminjikarai",
  "Anna Nagar",
  "Anna Nagar West",
  "Annanagar West Extn",
  "Anna Salai",
  "Arumbakkam",
  "Avadi",
  "Besant Nagar",
  "Chetpet",
  "Choolaimedu",
  "Chromepet",
  "Egmore",
  "George Town",
  "Gopalapuram",
  "Guindy",
  "K. K. Nagar",
  "Karapakkam",
  "Kelambakkam",
  "Kilpauk",
  "Kodambakkam",
  "Kodambakkam West",
  "Kotturpuram",
  "Madhavaram",
  "Madipakkam",
  "Manapakkam",
  "Medavakkam",
  "Mogappair",
  "Mogappair East",
  "Mylapore",
  "Nandanam",
  "Nanganallur",
  "Nungambakkam",
  "OMR / Padur",
  "Pallavaram",
  "Pallikaranai",
  "Park Town",
  "Perambur",
  "Periyapalayam",
  "Porur",
  "R. A. Puram",
  "Royapettah",
  "Saidapet",
  "Saligramam",
  "Selaiyur",
  "Shenoy Nagar",
  "Sholinganallur",
  "St. Thomas Mount",
  "Tambaram",
  "Tambaram East",
  "Tambaram West",
  "Tambaram Sanatorium",
  "Taramani",
  "T. Nagar",
  "Teynampet",
  "Thiruvanmiyur",
  "Thousand Lights",
  "Triplicane",
  "Vadapalani",
  "Velappanchavadi",
  "Velachery",
  "Virugambakkam",
  "West Mambalam",
];

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

/**
 * Intelligently extract ALL locality / area names found in permanent address text and pincode.
 */
export async function extractAllAreasFromAddress(
  address: string | null | undefined,
  pincode?: string | null | undefined,
): Promise<string[]> {
  const foundAreas = new Set<string>();

  // 1. Direct explicit pincode
  if (pincode) {
    const derived = await areaFromPincode(pincode);
    if (derived) foundAreas.add(derived);
  }

  if (!address || !address.trim()) {
    return Array.from(foundAreas);
  }

  const rawAddr = address.trim();

  // 2. All 6-digit pincodes in address text
  const pinMatches = rawAddr.match(/\b(6\d{5})\b/g);
  if (pinMatches) {
    for (const pin of pinMatches) {
      const derived = await areaFromPincode(pin);
      if (derived) foundAreas.add(derived);
    }
  }

  // 3. Scan for all known locality names
  const knownAreas = await listKnownAreas();
  const sortedKnown = [...new Set([...knownAreas, ...DEFAULT_KNOWN_AREAS])].sort(
    (a, b) => b.length - a.length,
  );

  const lowerAddr = rawAddr.toLowerCase();
  for (const area of sortedKnown) {
    const escaped = area
      .replace(/[+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\./g, "\\.?")
      .replace(/\s+/g, "\\s+");
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, "i");
    if (regex.test(lowerAddr)) {
      foundAreas.add(area);
    }
  }

  // 4. Comma-separated address segment fallback if no known areas found
  if (foundAreas.size === 0) {
    const parts = rawAddr
      .split(/[,;\n]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i];
        if (/^(chennai|tamil nadu|tamilnadu|india|\d{6})$/i.test(part)) continue;
        if (/^(no|flat|plot|door|street|st|rd|road|lane|cross|main)\b/i.test(part) && part.length < 5) continue;
        if (part.length >= 3 && part.length <= 35) {
          foundAreas.add(part);
          break;
        }
      }
    }
  }

  return Array.from(foundAreas);
}

/**
 * Returns the primary locality / area extracted from address.
 */
export async function extractAreaFromAddress(
  address: string | null | undefined,
  pincode?: string | null | undefined,
): Promise<string | null> {
  const all = await extractAllAreasFromAddress(address, pincode);
  return all.length > 0 ? all[0] : null;
}

// In-memory cache for area counts to prevent full-table scans on every /admin load
let cachedAreas: { data: Array<{ area: string; count: number }>; expires: number } | null = null;

export function invalidateAreaCountsCache(): void {
  cachedAreas = null;
}

/** Distinct areas + lead counts, for the filter pill bar on /admin. */
export async function listAreasWithCounts(
  assignedAdminUserId?: string,
): Promise<Array<{ area: string; count: number }>> {
  let allowedLeadIds: string[] | null = null;
  if (assignedAdminUserId) {
    const { data: items, error: itemsErr } = await supabase()
      .from("lead_list_items")
      .select("lead_id, lead_lists!inner(assigned_admin_user_id)")
      .eq("lead_lists.assigned_admin_user_id", assignedAdminUserId);
    if (itemsErr) throw itemsErr;
    allowedLeadIds = Array.from(
      new Set((items ?? []).map((r: { lead_id: string }) => r.lead_id)),
    );
    if (allowedLeadIds.length === 0) return [];
  }

  let q = supabase()
    .from("leads")
    .select("area, address, pincode")
    .range(0, 49999);
  if (allowedLeadIds) q = q.in("id", allowedLeadIds);

  const { data, error } = await q;
  if (error) throw error;
  const counts = new Map<string, number>();

  for (const r of (data ?? []) as { area: string | null; address: string | null; pincode: string | null }[]) {
    const leadAreas = new Set<string>();
    if (r.area?.trim()) {
      leadAreas.add(r.area.trim());
    }
    const extracted = await extractAllAreasFromAddress(r.address, r.pincode);
    for (const a of extracted) {
      leadAreas.add(a);
    }

    for (const a of leadAreas) {
      counts.set(a, (counts.get(a) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area));
}

/** Canonical area list from the lookup table — used for autocomplete suggestions
 *  on the lead form even before any lead has been tagged with that area. */
export async function listKnownAreas(): Promise<string[]> {
  const map = await loadPincodeMap();
  const dbAreas = Array.from(new Set(map.values()));
  return Array.from(new Set([...dbAreas, ...DEFAULT_KNOWN_AREAS])).sort((a, b) => a.localeCompare(b));
}
