import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDeltaToneClass } from "../visualSemantics";

type MetricCardProps = {
  title: string;
  value: string | ReactNode;
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
  const deltaToneClass =
    delta !== undefined
      ? getDeltaToneClass(delta, true)
      : "text-muted-foreground";

  const content = (
    <Card className="panel-card h-full transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-white/12">
      <CardHeader className={compact ? "pb-1 pt-4 px-4" : "pb-2 pt-4 px-4"}>
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent
        className={`${compact ? "px-4 pb-3" : "px-4 pb-4"} space-y-1.5`}
      >
        <div
          className={`${compact ? "text-xl" : "text-[1.75rem]"} flex items-center gap-2 font-black leading-none tracking-tight text-foreground`}
        >
          {value}
          {badge && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold ring-1",
                badge.includes("À frente")
                  ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25"
                  : "bg-amber-500/15 text-amber-300 ring-amber-500/25"
              )}
            >
              {badge}
            </span>
          )}
        </div>
        {delta !== undefined && (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-white/8 bg-background/65 px-2.5 py-1 text-xs font-medium",
              deltaToneClass
            )}
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
              <span className="font-normal text-muted-foreground/70">
                {deltaLabel}
              </span>
            )}
          </div>
        )}
        {hint && (
          <div className="text-xs leading-5 text-muted-foreground/75">
            {hint}
          </div>
        )}
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
