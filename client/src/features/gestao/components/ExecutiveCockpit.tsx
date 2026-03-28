import { ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GestaoBusinessStatus, GestaoExecutiveMetric } from "../types";
import { ExecutiveMetricCard } from "./ExecutiveMetricCard";
import { cn } from "@/lib/utils";

type ExecutiveCockpitProps = {
  businessStatus: GestaoBusinessStatus;
  metrics: GestaoExecutiveMetric[];
  comparisonEnabled: boolean;
};

function getBusinessTone(status: GestaoBusinessStatus["status"]) {
  if (status === "good") {
    return "border-emerald-500/25 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.24),_rgba(2,6,23,0.96)_58%)]";
  }
  if (status === "warning") {
    return "border-amber-500/25 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_rgba(2,6,23,0.96)_58%)]";
  }
  if (status === "critical") {
    return "border-rose-500/25 bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.22),_rgba(2,6,23,0.96)_58%)]";
  }
  return "border-slate-800 bg-slate-950";
}

export function ExecutiveCockpit({
  businessStatus,
  metrics,
  comparisonEnabled,
}: ExecutiveCockpitProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Visão Executiva
          </h2>
          <p className="text-sm text-muted-foreground">
            Diagnóstico semântico do negócio para decisão rápida.
          </p>
        </div>
        <div className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
          comparisonEnabled
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-card text-muted-foreground"
        }`}>
          {comparisonEnabled
            ? "Comparação ativa"
            : "Comparação desligada"}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card
          className={cn(
            "xl:col-span-4 border text-white shadow-[0_18px_50px_rgba(2,8,23,0.35)]",
            getBusinessTone(businessStatus.status)
          )}
        >
          <CardContent className="flex h-full flex-col justify-between gap-6 p-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-200">
                <ShieldCheck size={14} />
                Estado do negócio hoje
              </div>
              <div>
                <h3 className="text-3xl font-black leading-tight">
                  {businessStatus.headline}
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                  {businessStatus.summary}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Sparkles size={16} />
                Ação sugerida
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {businessStatus.actionHint}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-8 xl:grid-cols-3">
          {metrics.map(metric => (
            <ExecutiveMetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </div>
    </section>
  );
}
