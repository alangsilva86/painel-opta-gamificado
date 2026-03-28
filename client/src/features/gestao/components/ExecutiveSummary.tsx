import { AlertTriangle, CheckCircle2, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GestaoExecutiveNarrativeItem, GestaoFilterState } from "../types";

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
  if (severity === "critical") {
    return "border-rose-500/20 bg-rose-500/[0.05]";
  }
  if (severity === "warning") {
    return "border-amber-500/20 bg-amber-500/[0.05]";
  }
  return "border-emerald-500/20 bg-emerald-500/[0.05]";
}

export function ExecutiveSummary({
  items,
  onApplyFilter,
}: ExecutiveSummaryProps) {
  return (
    <Card className="border-slate-800 bg-slate-950">
      <CardHeader>
        <CardTitle className="text-white">Narrativa Executiva</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-4 text-sm text-slate-300">
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
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  {getSeverityIcon(item.severity)}
                  {item.headline}
                </div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  O que mudou
                </div>
                <p className="text-sm leading-6 text-slate-200">
                  {item.whatChanged}
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Por que mudou
                </div>
                <p className="text-sm leading-6 text-slate-300">{item.why}</p>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  O que fazer agora
                </div>
                <p className="text-sm leading-6 text-slate-300">
                  {item.action}
                </p>
              </div>

              <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Ação rápida
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    Abra o recorte recomendado para confirmar a hipótese.
                  </p>
                </div>
                {item.filters ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-700 bg-slate-900 text-slate-100"
                    onClick={() => onApplyFilter(item.filters ?? {})}
                  >
                    Aplicar recorte
                  </Button>
                ) : (
                  <div className="text-xs text-slate-500">
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
