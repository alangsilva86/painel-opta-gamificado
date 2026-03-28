import { describe, expect, it } from "vitest";
import {
  buildComparisonRange,
  endOfMonthISO,
  normalizeDateRange,
  startOfMonthISO,
} from "./dateRange";

describe("dateRange helpers", () => {
  it("normaliza intervalos invertidos", () => {
    expect(normalizeDateRange("2026-03-28", "2026-03-01")).toEqual({
      dateFrom: "2026-03-01",
      dateTo: "2026-03-28",
    });
  });

  it("calcula comparação mensal respeitando meses menores", () => {
    expect(
      buildComparisonRange("prev_month", "2026-03-31", "2026-03-31")
    ).toEqual({
      comparisonDateFrom: "2026-02-28",
      comparisonDateTo: "2026-02-28",
    });
  });

  it("expõe início e fim do mês em ISO", () => {
    const baseDate = new Date(2026, 2, 18);

    expect(startOfMonthISO(baseDate)).toBe("2026-03-01");
    expect(endOfMonthISO(baseDate)).toBe("2026-03-31");
  });
});
