import { AlertTriangle, CircleAlert, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GestaoFilterState, GestaoWatchlistItem } from "../types";

type WatchlistPanelProps = {
  items: GestaoWatchlistItem[];
  onApplyFilter: (partial: Partial<GestaoFilterState>) => void;
};

function getSeverityIcon(severity: GestaoWatchlistItem["severity"]) {
  if (severity === "critical") {
    return <ShieldAlert size={16} className="text-rose-300" />;
  }
  if (severity === "warning") {
    return <AlertTriangle size={16} className="text-amber-300" />;
  }
  return <CircleAlert size={16} className="text-sky-300" />;
}

function getSeverityClass(severity: GestaoWatchlistItem["severity"]) {
  if (severity === "critical") {
    return "border-rose-500/20 bg-rose-500/[0.05]";
  }
  if (severity === "warning") {
    return "border-amber-500/20 bg-amber-500/[0.05]";
  }
  return "border-sky-500/20 bg-sky-500/[0.05]";
}

export function WatchlistPanel({ items, onApplyFilter }: WatchlistPanelProps) {
  return (
    <Card className="border-slate-800 bg-slate-950">
      <CardHeader>
        <CardTitle className="text-white">Watchlist Executiva</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-4 text-sm text-slate-300">
            Nenhum sinal crítico aberto. Use os drivers para explorar ganhos
            adicionais.
          </div>
        )}

        {items.map(item => (
          <div
            key={item.id}
            className={`rounded-xl border px-4 py-4 ${getSeverityClass(item.severity)}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  {getSeverityIcon(item.severity)}
                  {item.title}
                </div>
                <p className="text-sm font-medium text-slate-100">
                  {item.impactLabel}
                </p>
                <p className="text-sm text-slate-300">{item.probableCause}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {item.cta}
                </p>
              </div>
              {item.filters && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-700 bg-slate-950 text-slate-100"
                  onClick={() => onApplyFilter(item.filters ?? {})}
                >
                  Investigar
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
