import "server-only";
import { supabase } from "./supabase";

let assignedLeadIdsCache: { set: Set<string>; expires: number } | null = null;
let inFlightAssignedPromise: Promise<Set<string>> | null = null;

export function invalidateAssignedLeadsCache(): void {
  assignedLeadIdsCache = null;
  inFlightAssignedPromise = null;
}

export function setAssignedLeadsCache(set: Set<string>, ttlMs: number = 300000): void {
  assignedLeadIdsCache = { set, expires: Date.now() + ttlMs };
}

export function markLeadsAsAssigned(leadIds: string[]): void {
  if (assignedLeadIdsCache) {
    for (const id of leadIds) assignedLeadIdsCache.set.add(id);
  }
}

/**
 * Fetch all assigned lead IDs with parallel chunk loading and in-memory 5-minute caching.
 */
export async function getAllAssignedLeadIds(): Promise<Set<string>> {
  if (assignedLeadIdsCache && assignedLeadIdsCache.expires > Date.now()) {
    return assignedLeadIdsCache.set;
  }
  if (inFlightAssignedPromise) {
    return inFlightAssignedPromise;
  }

  inFlightAssignedPromise = (async () => {
    try {
      const set = new Set<string>();

      const { count } = await supabase()
        .from("lead_list_items")
        .select("*", { count: "exact", head: true });

      const total = count || 5000;
      const batchSize = 1000;
      const chunkCount = Math.max(1, Math.ceil(total / batchSize));

      const chunkPromises = [];
      for (let i = 0; i < chunkCount; i++) {
        const start = i * batchSize;
        chunkPromises.push(
          supabase()
            .from("lead_list_items")
            .select("lead_id")
            .range(start, start + batchSize - 1),
        );
      }

      const chunkResults = await Promise.all(chunkPromises);
      for (const res of chunkResults) {
        if (res.data) {
          for (const item of res.data) {
            if (item.lead_id) set.add(item.lead_id);
          }
        }
      }

      assignedLeadIdsCache = { set, expires: Date.now() + 300000 };
      return set;
    } finally {
      inFlightAssignedPromise = null;
    }
  })();

  return inFlightAssignedPromise;
}
