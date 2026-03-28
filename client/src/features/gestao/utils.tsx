import React from "react";
import {
  addDays,
  format,
  getISOWeek,
  parseISO,
  startOfISOWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { GestaoExecutiveMetric, GestaoTimeseriesPoint } from "./types";
export { endOfMonthISO, startOfMonthISO } from "./dateRange";

export function formatCurrency(value?: number) {
  if (typeof value !== "number") return "R$ 0,00";
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
  label.length > max ? `${label.slice(0, max)}...` : label;

export const formatDateTick = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

export type TimeseriesGranularity = "day" | "week" | "month";

export type AggregatedTimeseriesPoint = GestaoTimeseriesPoint & {
  bucketLabel: string;
};

export function aggregateTimeseries(
  data: GestaoTimeseriesPoint[],
  granularity: TimeseriesGranularity
): AggregatedTimeseriesPoint[] {
  if (granularity === "day") {
    return data.map(point => ({
      ...point,
      bucketLabel: formatDateTick(point.date),
    }));
  }

  const grouped = new Map<string, AggregatedTimeseriesPoint>();

  data.forEach(point => {
    const parsed = parseISO(point.date);
    const bucketDate =
      granularity === "week"
        ? startOfISOWeek(parsed)
        : new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    const bucketKey = format(bucketDate, "yyyy-MM-dd");
    const bucketLabel =
      granularity === "week"
        ? `Sem ${getISOWeek(bucketDate)}`
        : format(bucketDate, "MMM/yy", { locale: ptBR });

    const current = grouped.get(bucketKey);
    if (!current) {
      grouped.set(bucketKey, {
        ...point,
        date: bucketKey,
        bucketLabel,
      });
      return;
    }

    current.contratos += point.contratos;
    current.contratosSemComissao += point.contratosSemComissao;
    current.liquido += point.liquido;
    current.comissao += point.comissao;
    current.liquidoComissionado =
      (current.liquidoComissionado ?? 0) + (point.liquidoComissionado ?? 0);
    current.comissaoComissionado =
      (current.comissaoComissionado ?? 0) + (point.comissaoComissionado ?? 0);
    current.takeRate =
      current.liquido > 0 ? current.comissao / current.liquido : 0;
    current.takeRateLimpo =
      (current.liquidoComissionado ?? 0) > 0
        ? (current.comissaoComissionado ?? 0) /
          (current.liquidoComissionado ?? 1)
        : 0;
  });

  return Array.from(grouped.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

export function formatGranularityTick(
  value: string,
  granularity: TimeseriesGranularity
) {
  if (granularity === "day") return formatDateTick(value);

  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return value;

  if (granularity === "week") {
    return `Sem ${getISOWeek(parsed)}`;
  }

  return format(parsed, "MMM/yy", { locale: ptBR });
}

export function formatGranularityTooltipLabel(
  value: string,
  granularity: TimeseriesGranularity
) {
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return value;

  if (granularity === "day") {
    return format(parsed, "dd/MM/yyyy", { locale: ptBR });
  }

  if (granularity === "week") {
    const weekEnd = addDays(parsed, 6);
    return `${format(parsed, "dd/MM", { locale: ptBR })} - ${format(weekEnd, "dd/MM", { locale: ptBR })}`;
  }

  return format(parsed, "MMMM 'de' yyyy", { locale: ptBR });
}

export type TooltipRow = { label: string; value: string; emphasis?: boolean };

export const tooltipBox = (title: string | undefined, rows: TooltipRow[]) => (
  <div className="space-y-1 rounded-xl border border-border bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-md">
    {title && <div className="font-semibold">{title}</div>}
    {rows.map(r => (
      <div key={r.label} className={r.emphasis ? "font-semibold" : ""}>
        {r.label}: {r.value}
      </div>
    ))}
  </div>
);

export function mergeExecutiveMetricsWithComparison(
  current: GestaoExecutiveMetric[],
  comparison?: GestaoExecutiveMetric[] | null
) {
  if (!comparison) return current;

  const comparisonMap = new Map(comparison.map(metric => [metric.id, metric]));
  return current.map(metric => {
    const previousMetric = comparisonMap.get(metric.id);
    if (!previousMetric || Math.abs(previousMetric.value) < 0.0001) {
      return metric;
    }

    return {
      ...metric,
      deltaVsComparison:
        (metric.value - previousMetric.value) / previousMetric.value,
    };
  });
}
