import type { GestaoExecutiveMetric } from "../types";
import { ExecutiveMetricCard } from "./ExecutiveMetricCard";

type ExecutiveCockpitProps = {
  metrics: GestaoExecutiveMetric[];
  comparisonEnabled: boolean;
};

export function ExecutiveCockpit({
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(metric => (
            <ExecutiveMetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </div>
    </section>
  );
}
