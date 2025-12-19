export function parseMoneyToNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;

  const trimmed = value.trim();
  if (!trimmed) return 0;

  let normalized = trimmed.replace(/[R$\s]/gi, "");
  normalized = normalized.replace(/\.(?=\d{3}(\D|$))/g, "");
  normalized = normalized.replace(",", ".");

  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function parseMoneyToCents(value: unknown): number {
  return Math.round(parseMoneyToNumber(value) * 100);
}

export function parsePercentToPercent(value: unknown): number {
  return parseMoneyToNumber(value);
}

export function parsePercentToFraction(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") {
    if (Number.isNaN(value) || value === 0) return 0;
    return value > 1 ? value / 100 : value;
  }

  if (typeof value !== "string") return 0;

  const normalized = value.replace("%", "").trim();
  if (!normalized) return 0;

  const parsed = parseMoneyToNumber(normalized);
  if (Number.isNaN(parsed) || parsed === 0) return 0;

  return parsed > 1 ? parsed / 100 : parsed;
}
