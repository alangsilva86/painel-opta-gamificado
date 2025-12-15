import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "../utils";
import { FilterState } from "../useGestaoFilters";

type Alert = {
  title: string;
  severity: "info" | "warning" | "critical";
  detail: string;
  filters?: Partial<FilterState>;
  generatedAt?: Date;
};

type AlertsCardProps = {
  alerts?: Alert[];
  filterState: FilterState;
  onFilter: (partial: Partial<FilterState>) => void;
  onRefresh: () => void;
};

const severityColors = {
  info: "border-blue-700 bg-blue-950 text-blue-100",
  warning: "border-amber-700 bg-amber-950 text-amber-100",
  critical: "border-red-700 bg-red-950 text-red-100",
};

export function AlertsCard({ alerts, filterState, onFilter, onRefresh }: AlertsCardProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <CardTitle>Alertas</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-300">
          Tudo estável. Revise mix e pipeline para oportunidades.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-950 border-slate-800">
      <CardHeader>
        <CardTitle>Alertas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert) => {
          const color =
            alert.severity === "critical"
              ? severityColors.critical
              : alert.severity === "warning"
                ? severityColors.warning
                : severityColors.info;
          return (
            <div
              key={alert.title}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 ${color}`}
            >
              <div>
                <div className="text-sm font-semibold flex items-center gap-2">
                  {alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️"}
                  {alert.title}
                </div>
                <div className="text-xs opacity-80">{alert.detail}</div>
                {alert.generatedAt && (
                  <div className="text-[11px] opacity-70">Disparou {formatRelativeTime(alert.generatedAt)}</div>
                )}
              </div>
              <div className="flex gap-2">
                {alert.filters && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      onFilter({
                        etapaPipeline: alert.filters?.etapaPipeline ?? filterState.etapaPipeline,
                        vendedorNome: alert.filters?.vendedorNome ?? filterState.vendedorNome,
                        produto: alert.filters?.produto ?? filterState.produto,
                      })
                    }
                  >
                    Filtrar
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={onRefresh}>
                  Limpar alerta
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
