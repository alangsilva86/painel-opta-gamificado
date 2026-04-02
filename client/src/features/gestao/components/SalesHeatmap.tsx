import { useMemo, useState } from "react";
import {
  eachDayOfInterval,
  endOfISOWeek,
  parseISO,
  startOfISOWeek,
} from "date-fns";
import { ChevronDown, ChevronUp, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatCurrency } from "../utils";
import type { GestaoTimeseriesPoint } from "../types";

type SalesHeatmapProps = {
  data: GestaoTimeseriesPoint[];
  dateFrom: string;
  dateTo: string;
};

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

function getHeatColor(intensity: number) {
  if (intensity <= 0) return "bg-background/80";
  if (intensity < 0.25) return "bg-emerald-950";
  if (intensity < 0.5) return "bg-emerald-800";
  if (intensity < 0.75) return "bg-emerald-600";
  return "bg-green-400";
}

export function SalesHeatmap({ data, dateFrom, dateTo }: SalesHeatmapProps) {
  const [open, setOpen] = useState(false);
  const [metric, setMetric] = useState<"contracts" | "commission">("contracts");

  const calendar = useMemo(() => {
    if (!dateFrom || !dateTo) return [];

    const start = startOfISOWeek(parseISO(dateFrom));
    const end = endOfISOWeek(parseISO(dateTo));
    const dataMap = new Map(data.map(point => [point.date, point]));

    return eachDayOfInterval({ start, end }).map(day => {
      const iso = day.toISOString().slice(0, 10);
      const point = dataMap.get(iso);
      return {
        iso,
        date: day,
        contratos: point?.contratos ?? 0,
        comissao: point?.comissao ?? 0,
      };
    });
  }, [data, dateFrom, dateTo]);

  const maxValue = useMemo(() => {
    if (calendar.length === 0) return 1;
    return Math.max(
      1,
      ...calendar.map(day =>
        metric === "contracts" ? day.contratos : day.comissao
      )
    );
  }, [calendar, metric]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="table-shell">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flame size={18} />
              Heatmap de vendas
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Densidade diária por semana e dia útil no período filtrado.
            </p>
          </div>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-background/72 px-3 py-2 text-sm text-foreground"
            >
              {open ? "Ocultar" : "Mostrar"}
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <Tabs
              value={metric}
              onValueChange={value =>
                setMetric(value as "contracts" | "commission")
              }
            >
              <TabsList className="bg-background/72">
                <TabsTrigger value="contracts">Por contratos</TabsTrigger>
                <TabsTrigger value="commission">Por comissão</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-3 overflow-x-auto">
              <div className="grid grid-rows-7 gap-1 pt-7 text-[11px] text-muted-foreground">
                {WEEKDAY_LABELS.map(label => (
                  <div key={label} className="h-4">
                    {label}
                  </div>
                ))}
              </div>
              <div
                className="grid auto-cols-max grid-flow-col grid-rows-7 gap-1"
                style={{ gridAutoColumns: "min-content" }}
              >
                {calendar.map((day, index) => {
                  const value =
                    metric === "contracts" ? day.contratos : day.comissao;
                  const intensity = value / maxValue;

                  return (
                    <Tooltip key={`${day.iso}-${index}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "size-4 rounded-[4px] border border-white/10 transition-transform hover:scale-110",
                            getHeatColor(intensity)
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <div className="space-y-1 text-xs">
                          <div className="font-semibold">
                            {day.date.toLocaleDateString("pt-BR")}
                          </div>
                          <div>Contratos: {day.contratos}</div>
                          <div>Comissão: {formatCurrency(day.comissao)}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>Menor</span>
              {[0, 0.2, 0.45, 0.7, 1].map(value => (
                <div
                  key={value}
                  className={cn("size-3 rounded-[3px]", getHeatColor(value))}
                />
              ))}
              <span>Maior</span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
