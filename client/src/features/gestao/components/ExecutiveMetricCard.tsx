import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GestaoExecutiveMetric } from "../types";
import { cn } from "@/lib/utils";

type ExecutiveMetricCardProps = {
  metric: GestaoExecutiveMetric;
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatTargetValue(metric: GestaoExecutiveMetric, value: number) {
  if (metric.id === "contratos") {
    return value.toLocaleString("pt-BR");
  }
  if (
    metric.id === "takeRate" ||
    metric.id === "shareSemComissao" ||
    metric.id === "concentracaoTop5"
  ) {
    return formatPercent(value);
  }
  return formatCurrency(value);
}

function getStatusTone(status: GestaoExecutiveMetric["status"]) {
  if (status === "good") {
    return {
      cardClass: "border-emerald-500/25 bg-emerald-500/[0.06]",
      badgeClass: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
      lineClass: "stroke-emerald-300",
      areaClass: "fill-emerald-400/10",
      label: "Saudável",
    };
  }
  if (status === "warning") {
    return {
      cardClass: "border-amber-500/25 bg-amber-500/[0.06]",
      badgeClass: "border-amber-400/35 bg-amber-500/10 text-amber-200",
      lineClass: "stroke-amber-300",
      areaClass: "fill-amber-400/10",
      label: "Atenção",
    };
  }
  if (status === "critical") {
    return {
      cardClass: "border-rose-500/25 bg-rose-500/[0.06]",
      badgeClass: "border-rose-400/35 bg-rose-500/10 text-rose-200",
      lineClass: "stroke-rose-300",
      areaClass: "fill-rose-400/10",
      label: "Risco",
    };
  }
  return {
    cardClass: "border-slate-800 bg-slate-950",
    badgeClass: "border-slate-700 bg-slate-800/80 text-slate-200",
    lineClass: "stroke-sky-300",
    areaClass: "fill-sky-400/10",
    label: "Contexto",
  };
}

function getTrendIcon(trend: GestaoExecutiveMetric["trend"]) {
  if (trend === "up") return <TrendingUp size={12} />;
  if (trend === "down") return <TrendingDown size={12} />;
  return <Minus size={12} />;
}

function getDeltaTone(
  delta: number,
  isLowerBetter: boolean
): { className: string; icon: ReactNode } {
  const favorable = isLowerBetter ? delta <= 0 : delta >= 0;
  if (Math.abs(delta) <= 0.01) {
    return {
      className: "text-slate-400",
      icon: <ArrowRight size={12} />,
    };
  }

  if (favorable) {
    return {
      className: "text-emerald-300",
      icon: <ArrowUpRight size={12} />,
    };
  }

  return {
    className: "text-rose-300",
    icon: <ArrowDownRight size={12} />,
  };
}

function buildSparklinePath(values: number[]) {
  if (values.length === 0) return { line: "", area: "" };
  const width = 132;
  const height = 42;
  const padding = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step =
    values.length === 1 ? 0 : (width - padding * 2) / (values.length - 1);

  const points = values.map((value, index) => {
    const x = padding + index * step;
    const y =
      height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const line = `M ${points.join(" L ")}`;
  const area = `${line} L ${padding + (values.length - 1) * step},${height - padding} L ${padding},${height - padding} Z`;
  return { line, area };
}

export function ExecutiveMetricCard({ metric }: ExecutiveMetricCardProps) {
  const tone = getStatusTone(metric.status);
  const { line, area } = buildSparklinePath(metric.sparkline);
  const comparisonTone =
    metric.deltaVsComparison !== undefined
      ? getDeltaTone(metric.deltaVsComparison, metric.isLowerBetter)
      : null;
  const targetTone =
    metric.deltaVsTarget !== undefined
      ? getDeltaTone(metric.deltaVsTarget, metric.isLowerBetter)
      : null;

  return (
    <Card
      className={cn(
        "h-full border text-white shadow-[0_10px_30px_rgba(2,8,23,0.25)]",
        tone.cardClass
      )}
    >
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-medium text-slate-200">
              {metric.label}
            </CardTitle>
            <p className="mt-1 text-xs text-slate-400">{metric.helpText}</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium",
              tone.badgeClass
            )}
          >
            {getTrendIcon(metric.trend)}
            {tone.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-3xl font-black tracking-tight">
              {metric.formattedValue}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {metric.microText}
            </div>
          </div>
          <svg
            viewBox="0 0 132 42"
            className="h-11 w-32 shrink-0 overflow-visible"
            aria-hidden="true"
          >
            <path d={area} className={cn("stroke-none", tone.areaClass)} />
            <path
              d={line}
              className={cn("fill-none stroke-[2.5]", tone.lineClass)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="grid gap-2 text-xs">
          {comparisonTone && metric.deltaVsComparison !== undefined && (
            <div
              className={cn(
                "flex items-center justify-between rounded-lg border border-white/6 bg-slate-950/60 px-2.5 py-2",
                comparisonTone.className
              )}
            >
              <span className="text-slate-400">vs período comparado</span>
              <span className="inline-flex items-center gap-1 font-semibold">
                {comparisonTone.icon}
                {metric.deltaVsComparison > 0 ? "+" : ""}
                {(metric.deltaVsComparison * 100).toFixed(1)}%
              </span>
            </div>
          )}
          {targetTone &&
            metric.deltaVsTarget !== undefined &&
            metric.targetValue !== undefined && (
              <div
                className={cn(
                  "flex items-center justify-between rounded-lg border border-white/6 bg-slate-950/60 px-2.5 py-2",
                  targetTone.className
                )}
              >
                <span className="text-slate-400">
                  alvo {formatTargetValue(metric, metric.targetValue)}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold">
                  {targetTone.icon}
                  {metric.deltaVsTarget > 0 ? "+" : ""}
                  {(metric.deltaVsTarget * 100).toFixed(1)}%
                </span>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
