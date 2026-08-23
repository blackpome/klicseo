import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase client and dependencies
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockIn = vi.fn();
const mockEq = vi.fn();
const mockLte = vi.fn();
const mockGte = vi.fn();

let mockSchedulesData: any[] = [];
let mockLeadsData: any[] = [];
let mockLeadListItemsData: any[] = [];
let mockAdminUsersData: any[] = [];
let mockLeadListsData: any[] = [];

let mockAllocationsLogData: any[] = [];

vi.mock("@/lib/supabase", () => ({
  supabase: () => ({
    from: (table: string) => {
      if (table === "lead_allocation_schedules") {
        return {
          select: (cols?: string) => ({
            eq: (field: string, val: any) => ({
              eq: (field2: string, val2: any) => ({
                lte: (field3: string, val3: any) => {
                  mockLte(field3, val3);
                  const filtered = mockSchedulesData.filter(
                    (s) =>
                      s[field] === val &&
                      s[field2] === val2 &&
                      new Date(s[field3]) <= new Date(val3),
                  );
                  return Promise.resolve({ data: filtered, error: null });
                },
                then: (resolve: any) => {
                  const filtered = mockSchedulesData.filter(
                    (s) => s[field] === val && s[field2] === val2,
                  );
                  return resolve({ data: filtered, error: null });
                },
              }),
              then: (resolve: any) => {
                const filtered = mockSchedulesData.filter((s) => s[field] === val);
                return resolve({ data: filtered, error: null });
              },
            }),
            order: () => Promise.resolve({ data: mockSchedulesData, error: null }),
          }),
          insert: (payload: any) => {
            mockInsert(payload);
            const row = Array.isArray(payload) ? payload[0] : payload;
            const newRow = { id: `sched-${Date.now()}`, ...row };
            mockSchedulesData.push(newRow);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: newRow, error: null }),
              }),
              then: (resolve: any) => resolve({ data: newRow, error: null }),
            };
          },
          update: (patch: any) => ({
            eq: (field: string, val: any) => {
              mockUpdate(patch, field, val);
              mockSchedulesData = mockSchedulesData.map((s) =>
                s[field] === val ? { ...s, ...patch } : s,
              );
              return Promise.resolve({ error: null });
            },
          }),
          delete: () => ({
            eq: (field: string, val: any) => {
              mockDelete(field, val);
              mockSchedulesData = mockSchedulesData.filter((s) => s[field] !== val);
              return Promise.resolve({ error: null });
            },
          }),
        };
      }

      if (table === "leads") {
        return {
          select: (cols?: string) => ({
            in: (field: string, vals: any[]) => ({
              order: () => ({
                range: () => Promise.resolve({ data: mockLeadsData, error: null }),
                limit: () => Promise.resolve({ data: mockLeadsData, error: null }),
              }),
              range: () => Promise.resolve({ data: mockLeadsData, error: null }),
              limit: () => Promise.resolve({ data: mockLeadsData, error: null }),
              then: (resolve: any) => resolve({ data: mockLeadsData, error: null }),
            }),
          }),
          update: (patch: any) => ({
            in: (field: string, vals: string[]) => {
              mockUpdate(patch, field, vals);
              mockLeadsData = mockLeadsData.map((l) =>
                vals.includes(l.id) ? { ...l, ...patch } : l,
              );
              return Promise.resolve({ error: null });
            },
          }),
        };
      }

      if (table === "lead_list_items") {
        return {
          select: (cols?: string) => ({
            eq: (field: string, val: any) => ({
              range: () => {
                const filtered = mockLeadListItemsData.filter((item) => item[field] === val);
                return Promise.resolve({ data: filtered, error: null });
              },
              then: (resolve: any) => {
                const filtered = mockLeadListItemsData.filter((item) => item[field] === val);
                return resolve({ data: filtered, error: null });
              },
            }),
            in: (field: string, vals: string[]) => ({
              range: () => {
                const filtered = mockLeadListItemsData.filter((item) => vals.includes(item[field]));
                return Promise.resolve({ data: filtered, error: null });
              },
              then: (resolve: any) => {
                const filtered = mockLeadListItemsData.filter((item) => vals.includes(item[field]));
                return resolve({ data: filtered, error: null });
              },
            }),
            range: () => Promise.resolve({ data: mockLeadListItemsData, error: null }),
            then: (resolve: any) => resolve({ data: mockLeadListItemsData, error: null }),
          }),
          insert: (items: any) => {
            const arr = Array.isArray(items) ? items : [items];
            mockLeadListItemsData.push(...arr);
            return Promise.resolve({ error: null });
          },
          delete: () => ({
            in: (field: string, vals: string[]) => {
              mockLeadListItemsData = mockLeadListItemsData.filter(
                (item) => !vals.includes(item[field]),
              );
              return Promise.resolve({ error: null });
            },
            eq: (field: string, val: string) => ({
              in: (field2: string, vals2: string[]) => {
                mockLeadListItemsData = mockLeadListItemsData.filter(
                  (item) => !(item[field] === val && vals2.includes(item[field2])),
                );
                return Promise.resolve({ error: null });
              },
            }),
          }),
        };
      }

      if (table === "lead_lists") {
        return {
          select: () => ({
            eq: (field: string, val: any) => {
              const filtered = mockLeadListsData.filter((l) => l[field] === val);
              return Promise.resolve({ data: filtered, error: null });
            },
            then: (resolve: any) => resolve({ data: mockLeadListsData, error: null }),
          }),
          insert: (payload: any) => {
            const row = Array.isArray(payload) ? payload[0] : payload;
            const newRow = { id: `list-${Date.now()}-${Math.random()}`, ...row };
            mockLeadListsData.push(newRow);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: newRow, error: null }),
              }),
            };
          },
          update: (patch: any) => ({
            eq: (field: string, val: any) => {
              mockLeadListsData = mockLeadListsData.map((l) =>
                l[field] === val ? { ...l, ...patch } : l,
              );
              return {
                select: () => Promise.resolve({ data: [{ id: "transferred-1" }], error: null }),
              };
            },
          }),
        };
      }

      if (table === "admin_users") {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockAdminUsersData, error: null }),
            }),
          }),
        };
      }

      if (table === "lead_allocations_log") {
        return {
          select: () => ({
            eq: (field: string, val: any) => ({
              order: () => {
                const filtered = mockAllocationsLogData.filter((log) => log[field] === val);
                return Promise.resolve({ data: filtered, error: null });
              },
            }),
          }),
          insert: (log: any) => {
            mockInsert(log);
            const arr = Array.isArray(log) ? log : [log];
            mockAllocationsLogData.push(...arr);
            return Promise.resolve({ error: null });
          },
        };
      }

      return {};
    },
  }),
}));

vi.mock("@/lib/admin-auth", () => ({
  currentAdmin: () => Promise.resolve({ email: "admin@klicseo.com", role: "super_admin", permissions: ["leads.view", "leads.manage"] }),
}));

vi.mock("@/lib/admin-users", () => ({
  getAdminUser: (email: string) => Promise.resolve({ id: "admin-123", email, role: "super_admin" }),
}));

import {
  matchesFilter,
  executeLeadAllocation,
  createAllocationSchedule,
  processScheduledJobs,
  processQueueAutoRefills,
  transferStaffLeads,
  recycleAndReassignLeads,
  listStaffWorkload,
  getLeadAllocationHistory,
} from "../lead-routing";

describe("Allocation Automations Full Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSchedulesData = [];
    mockLeadListItemsData = [];
    mockLeadListsData = [];
    mockAdminUsersData = [
      { id: "staff-1", email: "priya@klicseo.com", role: "staff", employees: { name: "Priya" } },
      { id: "staff-2", email: "girija@klicseo.com", role: "staff", employees: { name: "Girija" } },
    ];
    mockLeadsData = [
      { id: "lead-1", area: "Velachery", pincode: "600042", service: "Ceramic Coating", price_total: 8000, status: "new" },
      { id: "lead-2", area: "Velachery", pincode: "600042", service: "Ceramic Coating", price_total: 9000, status: "new" },
      { id: "lead-3", area: "OMR", pincode: "600096", service: "PPF", price_total: 15000, status: "new" },
      { id: "lead-4", area: "OMR", pincode: "600096", service: "PPF", price_total: 12000, status: "new" },
    ];
  });

  describe("1. Immediate Lead Allocation (once_now)", () => {
    it("allocates leads evenly across assignees and creates lists", async () => {
      const res = await createAllocationSchedule({
        schedule_mode: "once_now",
        lead_count: 2,
        conditions: { areas: ["Velachery"] },
        assignee_ids: ["staff-1", "staff-2"],
      });

      expect(res.mode).toBe("once_now");
      expect(res.allocatedCount).toBe(2);
      expect(mockLeadListItemsData.length).toBe(2);
      expect(mockLeadListsData.length).toBe(2); // 1 list per assignee
    });
  });

  describe("2. One-Time Future Scheduled Release (once_scheduled)", () => {
    it("creates pending schedule and executes when due", async () => {
      const pastTime = new Date(Date.now() - 60000).toISOString();
      const sched = await createAllocationSchedule({
        schedule_mode: "once_scheduled",
        scheduled_for: pastTime,
        lead_count: 2,
        conditions: {},
        assignee_ids: ["staff-1"],
      });

      expect(sched.mode).toBe("once_scheduled");
      expect(mockSchedulesData[0].status).toBe("pending");

      // Process cron job
      const cronRes = await processScheduledJobs();
      expect(cronRes.executedCount).toBe(1);
      expect(mockSchedulesData[0].status).toBe("completed");
    });
  });

  describe("3. Daily Recurring Automation (daily_recurring)", () => {
    it("executes recurring release on matching day and time", async () => {
      const now = new Date();
      const currentIstDay = now.getDay();
      const pastIstTime = "00:01"; // Early time guaranteed to be <= current time

      await createAllocationSchedule({
        schedule_mode: "daily_recurring",
        lead_count: 2,
        recurring_time: pastIstTime,
        recurring_days: [currentIstDay],
        conditions: {},
        assignee_ids: ["staff-1"],
      });

      expect(mockSchedulesData[0].status).toBe("active_recurring");

      // Process cron job
      const cronRes = await processScheduledJobs();
      expect(cronRes.executedCount).toBe(1);
      expect(mockSchedulesData[0].last_run_at).toBeDefined();

      // Running cron again today should not duplicate
      const secondRun = await processScheduledJobs();
      expect(secondRun.executedCount).toBe(0);
    });
  });

  describe("4. Queue Auto-Replenish Automation (queue_replenish)", () => {
    it("automatically refills queue when staff pending leads drop below threshold", async () => {
      // Create auto-refill rule with threshold 5
      await createAllocationSchedule({
        schedule_mode: "queue_replenish",
        replenish_threshold: 5,
        lead_count: 2,
        conditions: {},
        assignee_ids: ["staff-1"],
      });

      expect(mockSchedulesData[0].status).toBe("active_recurring");

      // Staff-1 currently has 0 pending leads <= threshold 5, so auto-refill triggers
      const refillRes = await processQueueAutoRefills();
      expect(refillRes.refilledStaffCount).toBe(1);
    });
  });

  describe("5. 1-Click Staff Reallocation (transferStaffLeads)", () => {
    it("transfers all lists from source staff to target staff", async () => {
      mockLeadListsData = [
        { id: "list-1", name: "Priya Campaign", assigned_admin_user_id: "staff-1" },
        { id: "list-2", name: "Priya Batch 2", assigned_admin_user_id: "staff-1" },
      ];

      const res = await transferStaffLeads("staff-1", "staff-2");
      expect(res.transferredCount).toBe(1);
    });
  });

  describe("6. Lead Recycling Automation (recycleAndReassignLeads)", () => {
    it("recycles non-booked leads, resets status, and creates new batch lists", async () => {
      mockLeadListsData = [
        { id: "source-list-1", name: "Old Campaign", assigned_admin_user_id: "staff-1" },
      ];
      mockLeadListItemsData = [
        { list_id: "source-list-1", lead_id: "lead-recycle-1", leads: { id: "lead-recycle-1", status: "call_not_responded" } },
        { list_id: "source-list-1", lead_id: "lead-recycle-2", leads: { id: "lead-recycle-2", status: "cancelled" } },
        { list_id: "source-list-1", lead_id: "lead-booked-3", leads: { id: "lead-booked-3", status: "booked" } },
      ];

      const res = await recycleAndReassignLeads({
        source_list_id: "source-list-1",
        target_admin_user_ids: ["staff-2"],
        include_statuses: ["call_not_responded", "cancelled"],
        reset_status_to_new: true,
      });

      expect(res.recycledCount).toBe(2);
      expect(res.protectedCount).toBe(1); // booked lead protected
      expect(res.createdListIds.length).toBe(1);
    });
  });

  describe("7. Persistent Campaign & Allocation History (getLeadAllocationHistory)", () => {
    it("fetches chronological list allocation and recycling history for a lead", async () => {
      mockAllocationsLogData = [
        {
          id: "log-1",
          created_at: "2026-08-19T09:30:00Z",
          lead_id: "lead-hist-1",
          allocation_type: "manual",
          reason: "Recycled from Old Campaign → Assigned to Girija",
          assigned_to_list_id: "list-2",
          lead_lists: { id: "list-2", name: "Recycled Leads (19/08/2026)" },
          admin_users: { id: "staff-2", email: "girija@klicseo.com", employees: { name: "Girija" } },
        },
        {
          id: "log-2",
          created_at: "2026-08-15T09:30:00Z",
          lead_id: "lead-hist-1",
          allocation_type: "daily_recurring",
          reason: "Initial release",
          assigned_to_list_id: "list-1",
          lead_lists: { id: "list-1", name: "Priya Campaign" },
          admin_users: { id: "staff-1", email: "priya@klicseo.com", employees: { name: "Priya" } },
        },
      ];

      const history = await getLeadAllocationHistory("lead-hist-1");
      expect(history.length).toBe(2);
      expect(history[0].listName).toBe("Recycled Leads (19/08/2026)");
      expect(history[0].staffName).toBe("Girija");
      expect(history[1].listName).toBe("Priya Campaign");
      expect(history[1].staffName).toBe("Priya");
    });
  });
});
