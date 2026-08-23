import "server-only";
import { cache } from "react";
import { supabase } from "./supabase";
import { unseal } from "./crypto";

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
  "Injambakkam",
  "Iyyappanthangal",
  "K. K. Nagar",
  "Karapakkam",
  "Keelkattalai",
  "Kelambakkam",
  "Kilpauk",
  "Kodambakkam",
  "Kodambakkam West",
  "Kolathur",
  "Kottivakkam",
  "Kotturpuram",
  "Kovilambakkam",
  "Madhavaram",
  "Madipakkam",
  "Manapakkam",
  "Medavakkam",
  "Meenambakkam",
  "Mogappair",
  "Mogappair East",
  "Moovarasampettai",
  "Mugalivakkam",
  "Mylapore",
  "Nandanam",
  "Nanganallur",
  "Nanmangalam",
  "Navalur",
  "Neelankarai",
  "Nungambakkam",
  "OMR / Padur",
  "Palavakkam",
  "Pallavaram",
  "Pallikaranai",
  "Park Town",
  "Perambur",
  "Periyapalayam",
  "Perumbakkam",
  "Perungudi",
  "Poonamallee",
  "Porur",
  "Puzhuthivakkam",
  "Puzhudhivakkam",
  "Puzhuthivakam",
  "R. A. Puram",
  "Ramapuram",
  "Royapettah",
  "Saidapet",
  "Saligramam",
  "Selaiyur",
  "Semmancheri",
  "Shenoy Nagar",
  "Sholinganallur",
  "Siruseri",
  "Sithalapakkam",
  "St. Thomas Mount",
  "Tambaram",
  "Tambaram East",
  "Tambaram West",
  "Tambaram Sanatorium",
  "Taramani",
  "T. Nagar",
  "Teynampet",
  "Thirumazhisai",
  "Thiruvanmiyur",
  "Thoraipakkam",
  "Thousand Lights",
  "Triplicane",
  "Ullagaram",
  "Vadapalani",
  "Valasaravakkam",
  "Velappanchavadi",
  "Velachery",
  "Virugambakkam",
  "West Mambalam",
];

// Disambiguation patterns: False-positive phrases to ignore or strip before matching
const FALSE_POSITIVE_PHRASES = [
  /adyar\s+anand[bh]a\s+bhavan/gi, // Restaurant chain landmark
  /anna\s+salai/gi, // Highway
  /gst\s+road/gi,
  /velachery\s+tambaram\s+main\s+road/gi, // Inter-locality highway
  /anna\s+nagar\s+(1st|2nd|3rd|4th|5th|6th|7th|8th|9th|\d+th)\s+street/gi,
  /kk\s+nagar\s+(1st|2nd|3rd|4th|5th|6th|7th|8th|9th|\d+th)\s+street/gi,
];

export const CANONICAL_AREA_ALIASES: Record<string, string> = {
  "puzhudhivakkam": "Puzhuthivakkam",
  "puzhuthivakam": "Puzhuthivakkam",
  "puzhuthivakkam": "Puzhuthivakkam",
  "madipakam": "Madipakkam",
  "madipakkam": "Madipakkam",
  "nanganalur": "Nanganallur",
  "nanganallur": "Nanganallur",
  "tnhb velachery": "Velachery",
  "velachery": "Velachery",
  "velacherry": "Velachery",
  "adambakkam": "Adambakkam",
  "adambakam": "Adambakkam",
  "guindy": "Guindy",
  "alandur": "Alandur",
  "alandhur": "Alandur",
  "st. thomas mount": "St. Thomas Mount",
  "st thomas mount": "St. Thomas Mount",
  "parangi malai": "St. Thomas Mount",
  "ullagaram": "Ullagaram",
  "moovarasampettai": "Moovarasampettai",
  "keelkattalai": "Keelkattalai",
  "keelkatalai": "Keelkattalai",
  "porur": "Porur",
  "palavanthangal": "Pazhavanthangal",
  "pazhavanthangal": "Pazhavanthangal",
  "t. nagar": "T. Nagar",
  "t nagar": "T. Nagar",
  "t.nagar": "T. Nagar",
  "k. k. nagar": "K. K. Nagar",
  "kk nagar": "K. K. Nagar",
  "k.k. nagar": "K. K. Nagar",
  "bv nagar": "Nanganallur",
};

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
    if (derived) {
      const canonical = CANONICAL_AREA_ALIASES[derived.toLowerCase()] || derived;
      foundAreas.add(canonical);
    }
  }

  if (!address || !address.trim()) {
    return Array.from(foundAreas);
  }

  // 2. Clean address by stripping false-positive landmarks & road names
  let cleanedAddr = address.trim();
  for (const fp of FALSE_POSITIVE_PHRASES) {
    cleanedAddr = cleanedAddr.replace(fp, " ");
  }

  // 3. All 6-digit pincodes in address text
  const pinMatches = cleanedAddr.match(/\b(6\d{5})\b/g);
  if (pinMatches) {
    for (const pin of pinMatches) {
      const derived = await areaFromPincode(pin);
      if (derived) {
        const canonical = CANONICAL_AREA_ALIASES[derived.toLowerCase()] || derived;
        foundAreas.add(canonical);
      }
    }
  }

  // 4. Scan for all known locality names
  const knownAreas = await listKnownAreas();
  const sortedKnown = [
    ...new Set([...knownAreas, ...DEFAULT_KNOWN_AREAS, ...Object.keys(CANONICAL_AREA_ALIASES)]),
  ].sort((a, b) => b.length - a.length);

  const lowerAddr = cleanedAddr.toLowerCase();
  for (const area of sortedKnown) {
    const escaped = area
      .replace(/[+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\./g, "\\.?")
      .replace(/\s+/g, "\\s+");
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, "i");
    if (regex.test(lowerAddr)) {
      const canonical = CANONICAL_AREA_ALIASES[area.toLowerCase()] || area;
      foundAreas.add(canonical);
    }
  }

  // 5. Comma-separated address segment fallback if no known areas found
  if (foundAreas.size === 0) {
    const parts = cleanedAddr
      .split(/[,;\n]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i];
        if (/^(chennai|tamil nadu|tamilnadu|india|\d{6})$/i.test(part)) continue;
        if (/^(no|flat|plot|door|street|st|rd|road|lane|cross|main)\b/i.test(part) && part.length < 5) continue;
        if (part.length >= 3 && part.length <= 35) {
          const canonical = CANONICAL_AREA_ALIASES[part.toLowerCase()] || part;
          foundAreas.add(canonical);
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
let cachedAreas: Record<string, { data: Array<{ area: string; count: number }>; expires: number }> | null = null;

export function invalidateAreaCountsCache(): void {
  cachedAreas = null;
}

/** Distinct areas + lead counts across ALL leads in the database, for the filter pill bar on /admin. */
export async function listAreasWithCounts(
  assignedAdminUserId?: string,
): Promise<Array<{ area: string; count: number }>> {
  const cacheKey = assignedAdminUserId || "global";
  if (cachedAreas && cachedAreas[cacheKey] && cachedAreas[cacheKey].expires > Date.now()) {
    return cachedAreas[cacheKey].data;
  }

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

  // Fetch ALL leads in 1000-row chunks across all 12,000+ rows
  const allLeads: Array<{ area: string | null; address: string | null; pincode: string | null }> = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    let q = supabase()
      .from("leads")
      .select("area, address, pincode")
      .range(from, from + batchSize - 1);
    if (allowedLeadIds) q = q.in("id", allowedLeadIds);

    const { data, error } = await q;
    if (error || !data || data.length === 0) break;
    allLeads.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  const counts = new Map<string, number>();

  for (const r of allLeads) {
    const leadAreas = new Set<string>();
    if (r.area?.trim()) {
      leadAreas.add(r.area.trim());
    }
    const plainAddress = unseal(r.address);
    const extracted = await extractAllAreasFromAddress(plainAddress, r.pincode);
    for (const a of extracted) {
      leadAreas.add(a);
    }

    for (const a of leadAreas) {
      counts.set(a, (counts.get(a) ?? 0) + 1);
    }
  }

  const sortedResult = [...counts.entries()]
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area));

  if (!cachedAreas) cachedAreas = {};
  cachedAreas[cacheKey] = {
    data: sortedResult,
    expires: Date.now() + 30000, // 30 second cache TTL
  };

  return sortedResult;
}

/**
 * Resolves all lead IDs matching an area name across both the area column
 * and the decrypted permanent address text.
 */
export async function resolveLeadIdsForArea(
  area: string,
  allowedLeadIds?: string[] | null,
): Promise<string[]> {
  const normTarget = (CANONICAL_AREA_ALIASES[area.trim().toLowerCase()] || area.trim()).toLowerCase();
  if (!normTarget || normTarget === "all") return [];

  const matchingIds: string[] = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    let q = supabase()
      .from("leads")
      .select("id, area, address, pincode")
      .range(from, from + batchSize - 1);
    if (allowedLeadIds) q = q.in("id", allowedLeadIds);

    const { data, error } = await q;
    if (error || !data || data.length === 0) break;

    for (const r of data as { id: string; area: string | null; address: string | null; pincode: string | null }[]) {
      const leadAreas = new Set<string>();
      if (r.area?.trim()) {
        const canonical = CANONICAL_AREA_ALIASES[r.area.trim().toLowerCase()] || r.area.trim();
        leadAreas.add(canonical.toLowerCase());
      }
      const plainAddress = unseal(r.address);
      const extracted = await extractAllAreasFromAddress(plainAddress, r.pincode);
      for (const a of extracted) {
        leadAreas.add(a.toLowerCase());
      }

      if (leadAreas.has(normTarget)) {
        matchingIds.push(r.id);
      }
    }

    if (data.length < batchSize) break;
    from += batchSize;
  }

  return matchingIds;
}

/** Canonical area list from the lookup table — used for autocomplete suggestions
 *  on the lead form even before any lead has been tagged with that area. */
export async function listKnownAreas(): Promise<string[]> {
  const map = await loadPincodeMap();
  const dbAreas = Array.from(new Set(map.values()));
  return Array.from(new Set([...dbAreas, ...DEFAULT_KNOWN_AREAS])).sort((a, b) => a.localeCompare(b));
}
