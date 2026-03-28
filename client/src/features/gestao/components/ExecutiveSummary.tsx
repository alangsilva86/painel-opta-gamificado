import { AlertTriangle, CheckCircle2, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GestaoExecutiveNarrativeItem, GestaoFilterState } from "../types";
import { getSeverityTone } from "../visualSemantics";

type ExecutiveSummaryProps = {
  items: GestaoExecutiveNarrativeItem[];
  onApplyFilter: (partial: Partial<GestaoFilterState>) => void;
};

function getSeverityIcon(severity: GestaoExecutiveNarrativeItem["severity"]) {
  if (severity === "critical") {
    return <Siren size={16} className="text-rose-300" />;
  }
  if (severity === "warning") {
    return <AlertTriangle size={16} className="text-amber-300" />;
  }
  return <CheckCircle2 size={16} className="text-emerald-300" />;
}

function getSeverityClass(severity: GestaoExecutiveNarrativeItem["severity"]) {
  return getSeverityTone(severity).panelClass;
}

export function ExecutiveSummary({
  items,
  onApplyFilter,
}: ExecutiveSummaryProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Narrativa Executiva</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && (
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
            Sem narrativa estruturada disponível para este recorte.
          </div>
        )}

        {items.map(item => (
          <div
            key={item.id}
            className={`rounded-2xl border px-4 py-4 ${getSeverityClass(item.severity)}`}
          >
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1fr_1fr_0.9fr]">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {getSeverityIcon(item.severity)}
                  {item.headline}
                </div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  O que mudou
                </div>
                <p className="text-sm leading-6 text-foreground">
                  {item.whatChanged}
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Por que mudou
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.why}
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  O que fazer agora
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.action}
                </p>
              </div>

              <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-background/60 p-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Ação rápida
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Abra o recorte recomendado para confirmar a hipótese.
                  </p>
                </div>
                {item.filters ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-border bg-secondary text-foreground"
                    onClick={() => onApplyFilter(item.filters ?? {})}
                  >
                    Aplicar recorte
                  </Button>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Sem recorte específico. Use os drivers abaixo.
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
