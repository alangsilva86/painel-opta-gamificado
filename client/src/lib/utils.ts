import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number,
  opts?: { compact?: boolean; fractionDigits?: number }
): string {
  const { compact = false, fractionDigits } = opts ?? {};
  if (compact) {
    if (Math.abs(value) >= 1_000_000) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: fractionDigits ?? 1,
        maximumFractionDigits: fractionDigits ?? 1,
      }).format(value / 1_000_000) + "M";
    }
    if (Math.abs(value) >= 1_000) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: fractionDigits ?? 0,
        maximumFractionDigits: fractionDigits ?? 0,
      }).format(value / 1_000) + "K";
    }
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: fractionDigits ?? 0,
    maximumFractionDigits: fractionDigits ?? 0,
  }).format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/** Returns "text-green-500" / "text-amber-400" / "text-primary" based on progress pct */
export function getProgressColor(pct: number): string {
  if (pct >= 100) return "text-green-500";
  if (pct >= 75) return "text-amber-400";
  return "text-primary";
}

/** Returns progress bar bg class based on pct */
export function getProgressBarColor(pct: number): string {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 75) return "bg-amber-400";
  return "bg-primary";
}
