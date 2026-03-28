import { AlertTriangle, CircleAlert, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GestaoFilterState, GestaoWatchlistItem } from "../types";
import { getSeverityTone } from "../visualSemantics";

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
  return getSeverityTone(severity).panelClass;
}

export function WatchlistPanel({ items, onApplyFilter }: WatchlistPanelProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Watchlist Executiva</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
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
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {getSeverityIcon(item.severity)}
                  {item.title}
                </div>
                <p className="text-sm font-medium text-foreground">
                  {item.impactLabel}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.probableCause}
                </p>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {item.cta}
                </p>
              </div>
              {item.filters && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border bg-secondary text-foreground"
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
