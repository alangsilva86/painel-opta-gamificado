import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type MetricCardProps = {
  title: string;
  value: string | React.ReactNode;
  hint?: string;
  badge?: string;
  compact?: boolean;
  tooltip?: string;
};

export function MetricCard({ title, value, hint, badge, compact = false, tooltip }: MetricCardProps) {
  const content = (
    <Card className="bg-slate-950 border-slate-800 h-full">
      <CardHeader className={compact ? "pb-1" : "pb-2"}>
        <CardTitle className="text-sm font-semibold text-slate-300">{title}</CardTitle>
      </CardHeader>
      <CardContent className={`${compact ? "text-lg" : "text-xl"} font-semibold flex items-center gap-2`}>
        {value}
        {badge && (
          <span
            className={`text-xs px-2 py-1 rounded ${
              badge.includes("À frente") ? "bg-emerald-900 text-emerald-200" : "bg-amber-900 text-amber-200"
            }`}
          >
            {badge}
          </span>
        )}
      </CardContent>
      {hint && <div className="px-4 pb-3 text-xs text-slate-400">{hint}</div>}
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
