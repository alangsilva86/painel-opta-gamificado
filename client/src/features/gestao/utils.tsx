export function startOfMonthISO(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function endOfMonthISO(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function formatCurrency(value?: number) {
  if (typeof value !== "number") return "R$ 0,00";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function formatPercent(value?: number) {
  if (typeof value !== "number") return "0%";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatRelativeTime(date?: string | Date | null) {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  return `${days}d atrás`;
}

export const shortLabel = (label: string, max = 12) =>
  label.length > max ? `${label.slice(0, max)}…` : label;

export const formatDateTick = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

export type TooltipRow = { label: string; value: string; emphasis?: boolean };

export const tooltipBox = (title: string | undefined, rows: TooltipRow[]) => (
  <div className="rounded-xl border border-slate-700 bg-slate-800/95 px-3 py-2 text-xs text-white shadow-md space-y-1">
    {title && <div className="font-semibold">{title}</div>}
    {rows.map((r) => (
      <div key={r.label} className={r.emphasis ? "font-semibold" : ""}>
        {r.label}: {r.value}
      </div>
    ))}
  </div>
);
import React from "react";
