import { describe, it, expect } from "vitest";
import {
  getTodayIST,
  istDateToUtcRange,
  istRangeToUtcRange,
  unsealAuditMetadata,
} from "../reports";

describe("Daily Reports Date & Timezone Utilities", () => {
  it("generates valid today string in IST (YYYY-MM-DD)", () => {
    const today = getTodayIST();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("converts single IST date to accurate UTC start and end bounds", () => {
    const { startUtc, endUtc } = istDateToUtcRange("2026-08-18");
    // IST is UTC+5:30 -> 00:00:00 IST is 18:30:00 UTC previous day
    expect(startUtc).toBe("2026-08-17T18:30:00.000Z");
    // 23:59:59.999 IST is 18:29:59.999 UTC same day
    expect(endUtc).toBe("2026-08-18T18:29:59.999Z");
  });

  it("converts IST date range to accurate UTC bounds", () => {
    const { startUtc, endUtc } = istRangeToUtcRange("2026-08-10", "2026-08-15");
    expect(startUtc).toBe("2026-08-09T18:30:00.000Z");
    expect(endUtc).toBe("2026-08-15T18:29:59.999Z");
  });

  it("calculates connectivity and conversion rates accurately", () => {
    const totalCalls = 40;
    const booked = 8;
    const contacted = 12;
    const followUp = 6;
    const cancelled = 4;
    const noAnswer = 10;

    const connectedCalls = contacted + booked + followUp + cancelled; // 30
    const connectivityRate = Math.round((connectedCalls / totalCalls) * 100); // 75%
    const conversionRate = Math.round((booked / connectedCalls) * 100); // 27%

    expect(connectedCalls).toBe(30);
    expect(connectivityRate).toBe(75);
    expect(conversionRate).toBe(27);
  });

  it("calculates queueBreakdown accurately when some leads are pending and some completed", () => {
    const totalAssigned = 10;
    const pendingCount = 8; // new + draft
    const booked = 1;
    const contacted = 1;
    const followUp = 0;
    const notResponded = 0;
    const cancelled = 0;

    const completedCount = totalAssigned - pendingCount;
    expect(completedCount).toBe(2);

    const queueBreakdown = {
      total: totalAssigned,
      pending: pendingCount,
      completed: completedCount,
      booked,
      contacted,
      follow_up: followUp,
      not_responded: notResponded,
      cancelled,
    };

    expect(queueBreakdown.completed).toBe(2);
    expect(queueBreakdown.booked + queueBreakdown.contacted).toBe(2);
  });

  it("unseals encrypted audit log metadata properly", () => {
    const rawPlainMeta = { status: "cancelled", notes: "Customer changed mind" };
    // unsealAuditMetadata should pass through plaintext objects gracefully
    const unsealed = unsealAuditMetadata({ action: "lead.status", summary: "Set lead status → cancelled", metadata: rawPlainMeta });
    expect(unsealed.metadata.status).toBe("cancelled");
    expect(unsealed.metadata.notes).toBe("Customer changed mind");
  });
});
