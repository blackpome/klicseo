import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Permission } from "@/lib/admin-users-shared";

// Mock the supabase client before importing the modules under test.
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

// Mock admin-users so getAdminUser returns a predictable id.
vi.mock("@/lib/admin-users", () => ({
  getAdminUser: vi.fn(async (email: string) => {
    if (email === "super@example.com") return { id: "sa-1", email, role: "super_admin", status: "active", permissions: [] as Permission[] };
    if (email === "admin@example.com") return { id: "ad-1", email, role: "admin", status: "active", permissions: [] as Permission[] };
    if (email === "staff@example.com") return { id: "sf-1", email, role: "staff", status: "active", permissions: [] as Permission[] };
    return null;
  }),
  listAdminUsers: vi.fn(async () => []),
  listAssignableAdminUsers: vi.fn(async () => []),
  resolvePrincipal: vi.fn(async (email: string) => {
    if (email === "super@example.com") return { email, role: "super_admin" as const, permissions: ["leads.view", "leads.manage", "employees.view", "employees.manage", "payments.view", "payments.manage"] as Permission[] };
    if (email === "admin@example.com") return { email, role: "admin" as const, permissions: ["leads.view", "leads.manage", "employees.view", "employees.manage", "payments.view", "payments.manage"] as Permission[] };
    if (email === "staff@example.com") return { email, role: "staff" as const, permissions: ["leads.view"] as Permission[] };
    return null;
  }),
  normalizeEmail: (e: string) => e.trim().toLowerCase(),
}));

describe("resolveScope", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns { kind: 'all' } for super_admin", async () => {
    const { resolveScope } = await import("@/lib/admin-auth");
    const me = { email: "super@example.com", role: "super_admin" as const, permissions: ["leads.view"] as Permission[] };
    const scope = await resolveScope(me);
    expect(scope).toEqual({ kind: "all" });
  });

  it("returns { kind: 'assigned' } for admin", async () => {
    const { resolveScope } = await import("@/lib/admin-auth");
    const me = { email: "admin@example.com", role: "admin" as const, permissions: ["leads.view"] as Permission[] };
    const scope = await resolveScope(me);
    expect(scope).toEqual({ kind: "assigned", adminUserId: "ad-1" });
  });

  it("returns { kind: 'assigned' } for staff", async () => {
    const { resolveScope } = await import("@/lib/admin-auth");
    const me = { email: "staff@example.com", role: "staff" as const, permissions: ["leads.view"] as Permission[] };
    const scope = await resolveScope(me);
    expect(scope).toEqual({ kind: "assigned", adminUserId: "sf-1" });
  });
});

describe("assertLeadInScope & isLeadInScope", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("isLeadInScope returns true immediately for super_admin (kind=all)", async () => {
    const { isLeadInScope, assertLeadInScope } = await import("@/lib/leads");
    const inScope = await isLeadInScope("lead-1", { kind: "all" });
    expect(inScope).toBe(true);
    await expect(assertLeadInScope("lead-1", { kind: "all" })).resolves.toBeUndefined();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("isLeadInScope returns true and assertLeadInScope succeeds when lead is in assigned list", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { lead_id: "lead-1" } });
    const { isLeadInScope, assertLeadInScope } = await import("@/lib/leads");
    const inScope = await isLeadInScope("lead-1", { kind: "assigned", adminUserId: "sf-1" });
    expect(inScope).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("lead_list_items");

    mockMaybeSingle.mockResolvedValueOnce({ data: { lead_id: "lead-1" } });
    await expect(assertLeadInScope("lead-1", { kind: "assigned", adminUserId: "sf-1" })).resolves.toBeUndefined();
  });

  it("isLeadInScope returns false and assertLeadInScope throws when lead is NOT in assigned list", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    const { isLeadInScope, assertLeadInScope } = await import("@/lib/leads");
    const inScope = await isLeadInScope("lead-1", { kind: "assigned", adminUserId: "sf-1" });
    expect(inScope).toBe(false);

    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    await expect(assertLeadInScope("lead-1", { kind: "assigned", adminUserId: "sf-1" })).rejects.toThrow(
      "Access Denied: This lead is outside your assigned scope."
    );
  });
});

describe("assertEmployeeInScope & isEmployeeInScope", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("isEmployeeInScope returns true immediately for super_admin (kind=all)", async () => {
    const { isEmployeeInScope, assertEmployeeInScope } = await import("@/lib/employees");
    const inScope = await isEmployeeInScope("emp-1", { kind: "all" });
    expect(inScope).toBe(true);
    await expect(assertEmployeeInScope("emp-1", { kind: "all" })).resolves.toBeUndefined();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("isEmployeeInScope returns true and assertEmployeeInScope succeeds when employee is assigned", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: "emp-1" } });
    const { isEmployeeInScope, assertEmployeeInScope } = await import("@/lib/employees");
    const inScope = await isEmployeeInScope("emp-1", { kind: "assigned", adminUserId: "sf-1" });
    expect(inScope).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("employees");

    mockMaybeSingle.mockResolvedValueOnce({ data: { id: "emp-1" } });
    await expect(assertEmployeeInScope("emp-1", { kind: "assigned", adminUserId: "sf-1" })).resolves.toBeUndefined();
  });

  it("isEmployeeInScope returns false and assertEmployeeInScope throws when employee is NOT assigned", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    const { isEmployeeInScope, assertEmployeeInScope } = await import("@/lib/employees");
    const inScope = await isEmployeeInScope("emp-1", { kind: "assigned", adminUserId: "sf-1" });
    expect(inScope).toBe(false);

    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    await expect(assertEmployeeInScope("emp-1", { kind: "assigned", adminUserId: "sf-1" })).rejects.toThrow(
      "Access Denied: This employee is outside your assigned scope."
    );
  });
});
