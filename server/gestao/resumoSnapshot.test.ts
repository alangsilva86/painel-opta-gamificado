import { describe, expect, it } from "vitest";
import { getMonthCoverage, sumProratedTargets } from "./resumoSnapshot";

describe("resumoSnapshot meta coverage helpers", () => {
  it("calculates full-month coverage with 100% weight", () => {
    const coverage = getMonthCoverage("2026-03-01", "2026-03-31");

    expect(coverage).toEqual([
      {
        monthKey: "2026-03",
        coveredDays: 31,
        totalDaysInMonth: 31,
        weight: 1,
      },
    ]);
  });

  it("prorates multi-month targets by covered days", () => {
    const coverage = getMonthCoverage("2026-02-15", "2026-03-10");
    const valuesByMonth = new Map<string, number>([
      ["2026-02", 28000],
      ["2026-03", 31000],
    ]);

    const result = sumProratedTargets(coverage, valuesByMonth);

    expect(result.missingMonths).toEqual([]);
    expect(result.total).toBeCloseTo(24000);
  });

  it("reports missing months without inflating the target", () => {
    const coverage = getMonthCoverage("2026-02-15", "2026-03-10");
    const valuesByMonth = new Map<string, number>([["2026-03", 31000]]);

    const result = sumProratedTargets(coverage, valuesByMonth);

    expect(result.total).toBeCloseTo(10000);
    expect(result.missingMonths).toEqual(["2026-02"]);
  });
});
