import { describe, it, expect } from "vitest";
import type { LeadStatus } from "@/lib/leads-shared";

describe("Lead Recycling & Status-Based Reassignment Business Logic", () => {
  const sampleLeads: { id: string; name: string; status: LeadStatus }[] = [
    { id: "1", name: "Anand", status: "booked" },
    { id: "2", name: "Balaji", status: "follow_up" },
    { id: "3", name: "Chandran", status: "call_not_responded" },
    { id: "4", name: "Deepak", status: "contacted" },
    { id: "5", name: "Elango", status: "cancelled" },
    { id: "6", name: "Farooq", status: "draft" },
    { id: "7", name: "Gopal", status: "booked" },
    { id: "8", name: "Hari", status: "follow_up" },
  ];

  it("protects both booked and follow_up leads by default", () => {
    const defaultAllowedStatuses: LeadStatus[] = [
      "call_not_responded",
      "contacted",
      "cancelled",
      "draft",
    ];

    const toRecycle = sampleLeads.filter((l) =>
      defaultAllowedStatuses.includes(l.status),
    );
    const protectedLeads = sampleLeads.filter(
      (l) => !defaultAllowedStatuses.includes(l.status),
    );

    // Booked and follow_ups should be in protectedLeads
    expect(toRecycle.map((l) => l.name)).toEqual([
      "Chandran",
      "Deepak",
      "Elango",
      "Farooq",
    ]);

    expect(protectedLeads.map((l) => l.name)).toEqual([
      "Anand",
      "Balaji",
      "Gopal",
      "Hari",
    ]);

    expect(toRecycle.length).toBe(4);
    expect(protectedLeads.length).toBe(4);
  });

  it("splits recycled leads evenly across multiple target telecallers", () => {
    const leadIds = ["3", "4", "5", "6"];
    const targetStaffIds = ["staff-rahul", "staff-jayavel"];

    const perStaff = Math.ceil(leadIds.length / targetStaffIds.length);
    const split1 = leadIds.slice(0, perStaff);
    const split2 = leadIds.slice(perStaff, perStaff * 2);

    expect(split1).toEqual(["3", "4"]);
    expect(split2).toEqual(["5", "6"]);
  });

  it("supports explicit inclusion of follow_up when admin overrides for staff leave coverage", () => {
    const overrideStatuses: LeadStatus[] = [
      "call_not_responded",
      "contacted",
      "cancelled",
      "draft",
      "follow_up",
    ];

    const toRecycle = sampleLeads.filter((l) =>
      overrideStatuses.includes(l.status),
    );
    const protectedLeads = sampleLeads.filter(
      (l) => !overrideStatuses.includes(l.status),
    );

    expect(toRecycle.map((l) => l.name)).toEqual([
      "Balaji",
      "Chandran",
      "Deepak",
      "Elango",
      "Farooq",
      "Hari",
    ]);

    // Only booked leads remain protected
    expect(protectedLeads.map((l) => l.name)).toEqual(["Anand", "Gopal"]);
  });
});
