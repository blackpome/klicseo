import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: () => ({
    from: mockFrom.mockReturnThis(),
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    maybeSingle: mockMaybeSingle,
    limit: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  }),
}));

vi.mock("@/lib/admin-users", () => ({
  getAdminUser: vi.fn(async (email: string) => {
    if (email === "staff@example.com") return { id: "staff-1", email, role: "staff", status: "active", permissions: ["leads.manage", "employees.manage"] };
    if (email === "super@example.com") return { id: "super-1", email, role: "super_admin", status: "active", permissions: ["leads.manage", "employees.manage"] };
    return null;
  }),
  listAdminUsers: vi.fn(async () => []),
  listAssignableAdminUsers: vi.fn(async () => []),
  resolvePrincipal: vi.fn(async () => null),
  normalizeEmail: (e: string) => e.trim().toLowerCase(),
}));

let currentMockAdmin: any = null;

vi.mock("@/lib/admin-auth", () => ({
  currentAdmin: vi.fn(async () => currentMockAdmin),
  requirePermission: vi.fn(async (perm: string) => {
    if (!currentMockAdmin) throw new Error("Unauthorized");
    if (!currentMockAdmin.permissions?.includes(perm)) throw new Error("Forbidden");
    return currentMockAdmin;
  }),
  resolveScope: vi.fn(async (me: any) => {
    if (!me) return null;
    if (me.role === "super_admin") return { kind: "all" as const };
    return { kind: "assigned" as const, adminUserId: me.role === "staff" ? "staff-1" : "admin-1" };
  }),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(async () => {}),
}));

vi.mock("@/lib/lead-routing", () => ({
  processQueueAutoRefills: vi.fn(async () => {}),
  createAllocationSchedule: vi.fn(async () => ({ ok: true, allocatedCount: 5, mode: "immediate" })),
  transferStaffLeads: vi.fn(async () => ({ transferredCount: 2 })),
  recycleAndReassignLeads: vi.fn(async () => ({ recycledCount: 3, assignedStaffCount: 1, protectedCount: 0, createdListIds: [] })),
  cancelScheduledAllocation: vi.fn(async () => {}),
  pauseScheduledAllocation: vi.fn(async () => {}),
  resumeScheduledAllocation: vi.fn(async () => {}),
  deleteScheduledAllocation: vi.fn(async () => {}),
  invalidateAssignedLeadsCache: vi.fn(() => {}),
  markLeadsAsAssigned: vi.fn(() => {}),
}));

vi.mock("@/lib/discounts", () => ({
  getServiceDiscounts: vi.fn(async () => ({})),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("Staff Access Control - Server Actions & Scope Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks staff from deleting leads (deleteLeadAction requires admin/super_admin)", async () => {
    currentMockAdmin = {
      email: "staff@example.com",
      role: "staff",
      permissions: ["leads.manage"],
    };

    const { deleteLeadAction } = await import("@/app/admin/actions");
    const formData = new FormData();
    formData.set("id", "lead-123");

    await expect(deleteLeadAction(formData)).rejects.toThrow("Forbidden: Only administrators can delete leads.");
  });

  it("allows super_admin to delete leads", async () => {
    currentMockAdmin = {
      email: "super@example.com",
      role: "super_admin",
      permissions: ["leads.manage"],
    };

    const { deleteLeadAction } = await import("@/app/admin/actions");
    const formData = new FormData();
    formData.set("id", "lead-123");

    // Mock deleteLead
    vi.spyOn(await import("@/lib/leads"), "deleteLead").mockResolvedValueOnce(undefined as any);

    await expect(deleteLeadAction(formData)).resolves.not.toThrow();
  });

  it("blocks staff from mutating lead status if lead is outside their assigned scope", async () => {
    currentMockAdmin = {
      email: "staff@example.com",
      role: "staff",
      permissions: ["leads.manage"],
    };

    // Mock query returning null (lead not assigned to staff-1)
    mockMaybeSingle.mockResolvedValueOnce({ data: null });

    const { setStatusAction } = await import("@/app/admin/actions");
    const formData = new FormData();
    formData.set("id", "lead-outside-scope");
    formData.set("status", "contacted");

    await expect(setStatusAction(formData)).rejects.toThrow("Access Denied: This lead is outside your assigned scope.");
  });

  it("blocks staff from allocating leads (submitLeadAllocationAction requires admin manager)", async () => {
    currentMockAdmin = {
      email: "staff@example.com",
      role: "staff",
      permissions: ["leads.manage"],
    };

    const { submitLeadAllocationAction } = await import("@/app/admin/lists/routing-actions");
    const res = await submitLeadAllocationAction({
      lead_count: 10,
      assignee_ids: ["staff-1"],
    } as any);

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Only administrators can allocate or reassign leads/i);
  });

  it("blocks staff from deleting employees (deleteEmployeeAction requires admin)", async () => {
    currentMockAdmin = {
      email: "staff@example.com",
      role: "staff",
      permissions: ["employees.manage"],
    };

    const { deleteEmployeeAction } = await import("@/app/admin/employees/actions");
    const formData = new FormData();
    formData.set("id", "emp-123");

    await expect(deleteEmployeeAction(formData)).rejects.toThrow("Forbidden: Only administrators can delete employees.");
  });

  it("blocks staff from editing employee outside their assigned scope", async () => {
    currentMockAdmin = {
      email: "staff@example.com",
      role: "staff",
      permissions: ["employees.manage"],
    };

    // Mock query returning null (employee not assigned to staff-1)
    mockMaybeSingle.mockResolvedValueOnce({ data: null });

    const { updateEmployeeAction } = await import("@/app/admin/employees/actions");
    const formData = new FormData();
    formData.set("id", "emp-outside-scope");
    formData.set("name", "John Doe");
    formData.set("phone", "9876543210");
    formData.set("job_role", "cleaner");

    await expect(updateEmployeeAction({}, formData)).rejects.toThrow(
      "Access Denied: This employee is outside your assigned scope."
    );
  });
});
