import { describe, it, expect } from "vitest";

function getActiveSidebarHref(pathname: string, allHrefs: string[]): string | null {
  // 1. Strict exact match
  for (const href of allHrefs) {
    if (pathname === href) return href;
  }

  // 2. Prefix match (e.g. /admin/employees/[id] matches /admin/employees)
  // Only match if no other more specific menu item matches pathname
  const prefixCandidates = allHrefs.filter((href) => {
    if (!pathname.startsWith(href + "/")) return false;
    const hasMoreSpecificMatch = allHrefs.some(
      (other) =>
        other !== href &&
        other.length > href.length &&
        (pathname === other || pathname.startsWith(other + "/")),
    );
    return !hasMoreSpecificMatch;
  });

  return prefixCandidates[0] || null;
}

describe("sidebar active item matcher", () => {
  const allHrefs = [
    "/admin",
    "/admin/lists",
    "/admin/new",
    "/admin/upload",
    "/admin/payments",
    "/admin/employees",
    "/admin/my-employees",
    "/admin/employees/new",
    "/admin/employees/upload",
    "/admin/jobs",
    "/admin/cars",
    "/admin/discount",
    "/admin/booking",
    "/admin/settings",
    "/admin/access",
    "/admin/logs",
  ];

  it("selects ONLY 'Upload Employees' when on /admin/employees/upload", () => {
    const active = getActiveSidebarHref("/admin/employees/upload", allHrefs);
    expect(active).toBe("/admin/employees/upload");
    expect(active).not.toBe("/admin/employees");
  });

  it("selects ONLY 'Add Employee' when on /admin/employees/new", () => {
    const active = getActiveSidebarHref("/admin/employees/new", allHrefs);
    expect(active).toBe("/admin/employees/new");
    expect(active).not.toBe("/admin/employees");
  });

  it("selects ONLY 'All Employees' when on /admin/employees", () => {
    const active = getActiveSidebarHref("/admin/employees", allHrefs);
    expect(active).toBe("/admin/employees");
    expect(active).not.toBe("/admin/employees/upload");
  });

  it("selects 'All Employees' for nested employee detail /admin/employees/123", () => {
    const active = getActiveSidebarHref("/admin/employees/123", allHrefs);
    expect(active).toBe("/admin/employees");
    expect(active).not.toBe("/admin/employees/upload");
  });

  it("selects ONLY 'Upload Leads' when on /admin/upload", () => {
    const active = getActiveSidebarHref("/admin/upload", allHrefs);
    expect(active).toBe("/admin/upload");
    expect(active).not.toBe("/admin");
  });

  it("selects ONLY 'All Leads' when on /admin", () => {
    const active = getActiveSidebarHref("/admin", allHrefs);
    expect(active).toBe("/admin");
    expect(active).not.toBe("/admin/upload");
  });

  it("selects 'All Leads' for lead detail /admin/uuid-lead-id", () => {
    const active = getActiveSidebarHref("/admin/uuid-lead-id", allHrefs);
    expect(active).toBe("/admin");
  });

  it("selects 'My Leads' (/admin/my-lists) for staff navigation", () => {
    const staffHrefs = [
      "/admin/my-lists",
      "/admin/reports",
      "/admin/new",
      "/admin/upload",
      "/admin/payments",
    ];
    const active = getActiveSidebarHref("/admin/my-lists", staffHrefs);
    expect(active).toBe("/admin/my-lists");
  });
});
