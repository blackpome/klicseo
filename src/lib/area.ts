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

// Locality Resolution and Cache Layer

/**
 * Resolves each lead to its single, most-accurate primary locality.
 */
export async function resolvePrimaryLocality(
  rawArea: string | null | undefined,
  plainAddress: string | null | undefined,
  pincode?: string | null | undefined,
): Promise<string | null> {
  const areaTrim = (rawArea || "").trim();
  const addrTrim = (plainAddress || "").trim();
  const pinTrim = (pincode || "").trim();

  let cleanedAddr = addrTrim;
  for (const fp of FALSE_POSITIVE_PHRASES) {
    cleanedAddr = cleanedAddr.replace(fp, " ");
  }
  const addrLower = cleanedAddr.toLowerCase();

  // 1. Scan address text for specific sub-localities (e.g. Puzhuthivakkam, Ullagaram, Alandur, Moovarasampettai)
  const knownAreas = await listKnownAreas();
  const sortedKnown = [
    ...new Set([...knownAreas, ...DEFAULT_KNOWN_AREAS, ...Object.keys(CANONICAL_AREA_ALIASES)]),
  ].sort((a, b) => b.length - a.length);

  for (const area of sortedKnown) {
    const escaped = area
      .replace(/[+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\./g, "\\.?")
      .replace(/\s+/g, "\\s+");
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, "i");
    if (regex.test(addrLower)) {
      return CANONICAL_AREA_ALIASES[area.toLowerCase()] || area;
    }
  }

  // 2. Direct Area column if specified
  if (areaTrim && areaTrim !== "null" && areaTrim !== "Unspecified") {
    const norm = areaTrim.toLowerCase();
    return CANONICAL_AREA_ALIASES[norm] || areaTrim;
  }

  // 3. Pincode lookup
  if (pinTrim) {
    const derived = await areaFromPincode(pinTrim);
    if (derived) {
      return CANONICAL_AREA_ALIASES[derived.toLowerCase()] || derived;
    }
  }

  // 4. Embedded pincode in address text
  const pinMatch = addrTrim.match(/\b(6\d{5})\b/);
  if (pinMatch) {
    const derived = await areaFromPincode(pinMatch[1]);
    if (derived) {
      return CANONICAL_AREA_ALIASES[derived.toLowerCase()] || derived;
    }
  }

  return null;
}

export interface LeadLocationSummary {
  id: string;
  primaryLocality: string;
  area: string | null;
  pincode: string | null;
  service?: string | null;
  price_total?: number | null;
  status?: string | null;
  source?: string | null;
  created_at?: string | null;
}

interface LocationIndexCache {
  expires: number;
  leadMap: Map<string, LeadLocationSummary>;
  areaToLeadIds: Map<string, string[]>;
  allLeads: LeadLocationSummary[];
}

let locationIndexCache: LocationIndexCache | null = null;
let inFlightLocationIndexPromise: Promise<LocationIndexCache> | null = null;

export function invalidateAreaCountsCache(): void {
  locationIndexCache = null;
  inFlightLocationIndexPromise = null;
}

/**
 * Fast parallel-cached index of all lead locations with in-flight request de-duplication.
 */
export async function getOrBuildLocationIndex(): Promise<LocationIndexCache> {
  const now = Date.now();
  if (locationIndexCache && locationIndexCache.expires > now) {
    return locationIndexCache;
  }

  if (inFlightLocationIndexPromise) {
    return inFlightLocationIndexPromise;
  }

  inFlightLocationIndexPromise = (async () => {
    try {
      // 1. Get exact total count to fire parallel chunk requests
      const { count } = await supabase()
        .from("leads")
        .select("*", { count: "exact", head: true });

      const total = count || 13000;
      const batchSize = 1000;
      const chunkCount = Math.ceil(total / batchSize);

      const chunkPromises = [];
      for (let i = 0; i < chunkCount; i++) {
        const start = i * batchSize;
        chunkPromises.push(
          supabase()
            .from("leads")
            .select("id, area, address, pincode, service, price_total, status, source, created_at")
            .range(start, start + batchSize - 1),
        );
      }

      const chunkResults = await Promise.all(chunkPromises);
      const allRows: Array<{
        id: string;
        area: string | null;
        address: string | null;
        pincode: string | null;
        service: string | null;
        price_total: number | null;
        status: string | null;
        source: string | null;
        created_at: string | null;
      }> = [];

      for (const res of chunkResults) {
        if (res.data) allRows.push(...res.data);
      }

      const leadMap = new Map<string, LeadLocationSummary>();
      const areaToLeadIds = new Map<string, string[]>();
      const allLeads: LeadLocationSummary[] = [];

      for (const r of allRows) {
        const plainAddress = unseal(r.address);
        const primary = await resolvePrimaryLocality(r.area, plainAddress, r.pincode);
        const resolved = primary || "Unspecified";
        const norm = resolved.toLowerCase();

        const summary: LeadLocationSummary = {
          id: r.id,
          primaryLocality: resolved,
          area: r.area,
          pincode: r.pincode,
          service: r.service,
          price_total: r.price_total,
          status: r.status,
          source: r.source,
          created_at: r.created_at,
        };

        leadMap.set(r.id, summary);
        allLeads.push(summary);

        if (resolved !== "Unspecified") {
          if (!areaToLeadIds.has(norm)) {
            areaToLeadIds.set(norm, []);
          }
          areaToLeadIds.get(norm)!.push(r.id);
        }
      }

      locationIndexCache = {
        expires: Date.now() + 120000, // 2-minute in-memory TTL
        leadMap,
        areaToLeadIds,
        allLeads,
      };

      return locationIndexCache;
    } finally {
      inFlightLocationIndexPromise = null;
    }
  })();

  return inFlightLocationIndexPromise;
}

/** Distinct areas + lead counts across ALL leads in the database, for the filter pill bar on /admin. */
export async function listAreasWithCounts(
  assignedAdminUserId?: string,
): Promise<Array<{ area: string; count: number }>> {
  const index = await getOrBuildLocationIndex();

  let allowedSet: Set<string> | null = null;
  if (assignedAdminUserId) {
    const { data: items, error: itemsErr } = await supabase()
      .from("lead_list_items")
      .select("lead_id, lead_lists!inner(assigned_admin_user_id)")
      .eq("lead_lists.assigned_admin_user_id", assignedAdminUserId);
    if (itemsErr) throw itemsErr;
    allowedSet = new Set((items ?? []).map((r: { lead_id: string }) => r.lead_id));
    if (allowedSet.size === 0) return [];
  }

  const counts = new Map<string, number>();

  for (const lead of index.allLeads) {
    if (allowedSet && !allowedSet.has(lead.id)) continue;
    if (lead.primaryLocality !== "Unspecified") {
      counts.set(lead.primaryLocality, (counts.get(lead.primaryLocality) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area));
}

/**
 * Resolves all lead IDs matching an area name across both the area column
 * and the decrypted permanent address text in 0ms via index cache.
 */
export async function resolveLeadIdsForArea(
  area: string,
  allowedLeadIds?: string[] | null,
): Promise<string[]> {
  const normTarget = (CANONICAL_AREA_ALIASES[area.trim().toLowerCase()] || area.trim()).toLowerCase();
  if (!normTarget || normTarget === "all") return [];

  const index = await getOrBuildLocationIndex();
  const ids = index.areaToLeadIds.get(normTarget) ?? [];

  if (allowedLeadIds && allowedLeadIds.length > 0) {
    const allowedSet = new Set(allowedLeadIds);
    return ids.filter((id) => allowedSet.has(id));
  }

  return ids;
}

/** Canonical area list from the lookup table — used for autocomplete suggestions
 *  on the lead form even before any lead has been tagged with that area. */
export async function listKnownAreas(): Promise<string[]> {
  const map = await loadPincodeMap();
  const dbAreas = Array.from(new Set(map.values()));
  return Array.from(new Set([...dbAreas, ...DEFAULT_KNOWN_AREAS])).sort((a, b) => a.localeCompare(b));
}
