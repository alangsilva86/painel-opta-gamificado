import { ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GestaoBusinessStatus, GestaoExecutiveMetric } from "../types";
import { ExecutiveMetricCard } from "./ExecutiveMetricCard";
import { cn } from "@/lib/utils";
import { getExecutiveHeroClass } from "../visualSemantics";

type ExecutiveCockpitProps = {
  businessStatus: GestaoBusinessStatus;
  metrics: GestaoExecutiveMetric[];
  comparisonEnabled: boolean;
};

export function ExecutiveCockpit({
  businessStatus,
  metrics,
  comparisonEnabled,
}: ExecutiveCockpitProps) {
  return (
    <section className="page-hero px-5 py-5 sm:px-6">
      <div className="relative space-y-5">
        <div className="page-section-header">
          <div>
            <div className="metric-label">Command center</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">
              Visão executiva do recorte
            </h2>
            <p className="page-section-copy mt-2 max-w-2xl">
              Síntese de risco, direção de negócio e foco recomendado para a
              próxima decisão.
            </p>
          </div>
          <div
            className={`status-chip ${
              comparisonEnabled
                ? "border-primary/30 bg-primary/10 text-primary-foreground"
                : "border-white/10 bg-background/55 text-muted-foreground"
            }`}
          >
            {comparisonEnabled ? "Comparação ativa" : "Comparação desligada"}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-12">
          <Card
            className={cn(
              "panel-card-strong xl:col-span-4 border text-foreground shadow-[0_18px_50px_rgba(2,8,23,0.35)]",
              getExecutiveHeroClass(businessStatus.status)
            )}
          >
            <CardContent className="flex h-full flex-col justify-between gap-6 p-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/85">
                  <ShieldCheck size={14} />
                  Estado do negócio hoje
                </div>
                <div>
                  <h3 className="text-3xl font-black leading-tight">
                    {businessStatus.headline}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
                    {businessStatus.summary}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-background/35 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
                  <Sparkles size={16} />
                  Ação sugerida
                </div>
                <p className="mt-2 text-sm leading-6 text-white/75">
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
      </div>
    </section>
  );
}
