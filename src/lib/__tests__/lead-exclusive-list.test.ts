import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDeleteIn = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: () => ({
    from: (table: string) => {
      if (table === "lead_list_items") {
        return {
          delete: () => ({
            in: (field: string, values: string[]) => {
              mockDeleteIn(field, values);
              return Promise.resolve({ error: null });
            },
          }),
          insert: (items: unknown) => {
            mockInsert(items);
            return Promise.resolve({ error: null });
          },
        };
      }
      return {};
    },
  }),
}));

import { addLeadsToList } from "../leadLists";

describe("Exclusive 1-to-1 lead list rule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes leads from any previous lists before adding to a new list", async () => {
    const targetListId = "list-target-456";
    const leadIds = ["lead-1", "lead-2", "lead-3"];

    await addLeadsToList(targetListId, leadIds);

    // 1. Must delete any existing list memberships for these leads
    expect(mockDeleteIn).toHaveBeenCalledWith("lead_id", ["lead-1", "lead-2", "lead-3"]);

    // 2. Must insert them exclusively into the target list
    expect(mockInsert).toHaveBeenCalledWith([
      { list_id: targetListId, lead_id: "lead-1" },
      { list_id: targetListId, lead_id: "lead-2" },
      { list_id: targetListId, lead_id: "lead-3" },
    ]);
  });
});
