import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingDown, TrendingUp } from "lucide-react";

type MetricCardProps = {
  title: string;
  value: string | React.ReactNode;
  hint?: string;
  badge?: string;
  compact?: boolean;
  tooltip?: string;
  delta?: number;
  deltaLabel?: string;
};

export function MetricCard({
  title,
  value,
  hint,
  badge,
  compact = false,
  tooltip,
  delta,
  deltaLabel,
}: MetricCardProps) {
  const deltaPositive = delta !== undefined && delta > 0.01;
  const deltaNegative = delta !== undefined && delta < -0.01;

  const content = (
    <Card className="bg-card border-border h-full transition-colors hover:border-border/80">
      <CardHeader className={compact ? "pb-1 pt-4 px-4" : "pb-2 pt-4 px-4"}>
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={`${compact ? "px-4 pb-3" : "px-4 pb-4"} space-y-1.5`}>
        <div
          className={`${compact ? "text-xl" : "text-2xl"} font-bold text-foreground flex items-center gap-2 leading-none`}
        >
          {value}
          {badge && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                badge.includes("À frente")
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25"
                  : "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25"
              }`}
            >
              {badge}
            </span>
          )}
        </div>
        {delta !== undefined && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              deltaPositive
                ? "text-emerald-400"
                : deltaNegative
                  ? "text-rose-400"
                  : "text-muted-foreground"
            }`}
          >
            {deltaPositive ? (
              <TrendingUp size={12} strokeWidth={2.5} />
            ) : deltaNegative ? (
              <TrendingDown size={12} strokeWidth={2.5} />
            ) : null}
            <span>
              {delta > 0 ? "+" : ""}
              {(delta * 100).toFixed(1)}%
            </span>
            {deltaLabel && (
              <span className="font-normal text-muted-foreground/70">{deltaLabel}</span>
            )}
          </div>
        )}
        {hint && <div className="text-xs text-muted-foreground/70">{hint}</div>}
      </CardContent>
    </Card>
  );

  if (!tooltip) return content;

  return (
    <UiTooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent className="text-xs max-w-xs">{tooltip}</TooltipContent>
    </UiTooltip>
  );
}
