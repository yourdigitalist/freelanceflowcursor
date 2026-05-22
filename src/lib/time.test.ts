import { describe, expect, it } from "vitest";
import { startOfMonth, endOfMonth } from "date-fns";
import { sumMonthSecondsFromDayTotals, timeMonthCalendarDurationClassName } from "./time";

describe("sumMonthSecondsFromDayTotals", () => {
  it("sums only days inside the month", () => {
    const monthStart = startOfMonth(new Date(2026, 4, 15));
    const monthEnd = endOfMonth(monthStart);
    const totals = {
      "2026-05-10": 3600,
      "2026-05-20": 1800,
      "2026-06-01": 9999,
    };
    expect(sumMonthSecondsFromDayTotals(totals, monthStart, monthEnd)).toBe(5400);
  });
});

describe("timeMonthCalendarDurationClassName", () => {
  it("uses blue styling when day has entries", () => {
    expect(timeMonthCalendarDurationClassName(true)).toContain("text-blue");
    expect(timeMonthCalendarDurationClassName(false)).toContain("muted");
  });
});
