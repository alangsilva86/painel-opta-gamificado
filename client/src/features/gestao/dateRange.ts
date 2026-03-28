import type { GestaoComparisonPreset } from "./types";

export type GestaoDateRange = {
  dateFrom: string;
  dateTo: string;
};

export function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfMonthISO(date: Date) {
  return formatISODate(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonthISO(date: Date) {
  return formatISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function normalizeDateRange(dateFrom: string, dateTo: string) {
  const from = parseDateOnly(dateFrom);
  const to = parseDateOnly(dateTo);
  const hasBothDates = dateFrom.length >= 10 && dateTo.length >= 10;

  if (
    !hasBothDates ||
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime())
  ) {
    return null;
  }

  return from.getTime() <= to.getTime()
    ? { dateFrom, dateTo }
    : { dateFrom: dateTo, dateTo: dateFrom };
}

export function shiftDaysISO(dateISO: string, days: number) {
  const date = parseDateOnly(dateISO);
  const target = new Date(date);
  target.setDate(target.getDate() + days);
  return formatISODate(target);
}

export function shiftMonthsISO(dateISO: string, months: number) {
  const date = parseDateOnly(dateISO);
  const targetMonthIndex = date.getMonth() + months;
  const lastDayOfTargetMonth = new Date(
    date.getFullYear(),
    targetMonthIndex + 1,
    0
  ).getDate();
  const target = new Date(
    date.getFullYear(),
    targetMonthIndex,
    Math.min(date.getDate(), lastDayOfTargetMonth)
  );
  return formatISODate(target);
}

export function shiftYearsISO(dateISO: string, years: number) {
  const date = parseDateOnly(dateISO);
  const target = new Date(date);
  target.setFullYear(target.getFullYear() + years);
  return formatISODate(target);
}

export function buildComparisonRange(
  mode: Exclude<GestaoComparisonPreset, "custom">,
  dateFrom: string,
  dateTo: string
): {
  comparisonDateFrom: string;
  comparisonDateTo: string;
} {
  if (mode === "prev_week") {
    return {
      comparisonDateFrom: shiftDaysISO(dateFrom, -7),
      comparisonDateTo: shiftDaysISO(dateTo, -7),
    };
  }

  if (mode === "prev_year") {
    return {
      comparisonDateFrom: shiftYearsISO(dateFrom, -1),
      comparisonDateTo: shiftYearsISO(dateTo, -1),
    };
  }

  return {
    comparisonDateFrom: shiftMonthsISO(dateFrom, -1),
    comparisonDateTo: shiftMonthsISO(dateTo, -1),
  };
}
