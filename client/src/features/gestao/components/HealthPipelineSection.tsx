import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatCurrency,
  formatGranularityTick,
  formatGranularityTooltipLabel,
  formatPercent,
  shortLabel,
  tooltipBox,
  type TimeseriesGranularity,
} from "../utils";
import { EmptyChart } from "./EmptyChart";

type SeriesVisibility = {
  comissao: boolean;
  liquido: boolean;
  liquidoSem: boolean;
};

type HealthPipelineSectionProps = {
  timeseriesData: Array<any>;
  stageData: Array<any>;
  seriesVisibility: SeriesVisibility;
  onLegendToggle: (dataKey?: string) => void;
  necessarioPorDia?: number | null;
  granularity: TimeseriesGranularity;
  onGranularityChange: (value: TimeseriesGranularity) => void;
  onStageClick: (etapa: string) => void;
  onClearFilters: () => void;
};

export function HealthPipelineSection({
  timeseriesData,
  stageData,
  seriesVisibility,
  onLegendToggle,
  necessarioPorDia,
  granularity,
  onGranularityChange,
  onStageClick,
  onClearFilters,
}: HealthPipelineSectionProps) {
  const currencyTick = (v: number) => formatCurrency(v);

  const dualLineTooltip = ({ label, payload }: any) => {
    if (!payload || payload.length === 0) return null;
    const date = label ? formatGranularityTooltipLabel(label, granularity) : "";
    const item = payload[0]?.payload;
    return tooltipBox(date, [
      ...(seriesVisibility.comissao
        ? [
            {
              label: "Comissão",
              value: formatCurrency(item?.comissaoPlot ?? item?.comissao ?? 0),
              emphasis: true,
            },
          ]
        : []),
      ...(seriesVisibility.liquido
        ? [
            {
              label: "Líquido",
              value: formatCurrency(item?.liquidoPlot ?? item?.liquido ?? 0),
            },
          ]
        : []),
      {
        label: "Contratos sem comissão",
        value: String(item?.contratosSemComissao ?? 0),
      },
    ]);
  };

  const dualBarTooltip = ({ label, payload }: any) => {
    if (!payload || payload.length === 0) return null;
    const item = payload[0]?.payload;
    const liquidoVal = item?.liquidoPlot ?? item?.liquido ?? 0;
    const comissaoVal = item?.comissaoPlot ?? item?.comissao ?? 0;
    const takeRateVal = liquidoVal > 0 ? comissaoVal / liquidoVal : 0;
    return tooltipBox(label, [
      ...(seriesVisibility.comissao
        ? [
            {
              label: "Comissão",
              value: formatCurrency(comissaoVal),
              emphasis: true,
            },
          ]
        : []),
      ...(seriesVisibility.liquido
        ? [{ label: "Líquido", value: formatCurrency(liquidoVal) }]
        : []),
      ...(item?.liquidoSem !== undefined
        ? [
            {
              label: "Líquido sem comissão",
              value: formatCurrency(item.liquidoSem),
            },
          ]
        : []),
      ...(item?.count !== undefined
        ? [{ label: "Contratos", value: String(item.count) }]
        : []),
      ...(item?.semComissaoCount !== undefined
        ? [{ label: "Sem comissão", value: String(item.semComissaoCount) }]
        : []),
      { label: "Comissão média", value: formatPercent(takeRateVal) },
    ]);
  };

  const gridColor = "rgba(255,255,255,0.06)";
  const axisColor = "rgba(255,255,255,0.35)";
  const legendFormatter = (value: string, entry: any, hiddenKey: boolean) => (
    <span className={`text-xs ${hiddenKey ? "text-muted-foreground/50 line-through" : "text-foreground/80"}`}>
      {value}
    </span>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-sm font-semibold">Comissão × Líquido ao longo do tempo</CardTitle>
            <Tabs
              value={granularity}
              onValueChange={value =>
                onGranularityChange(value as TimeseriesGranularity)
              }
            >
              <TabsList className="bg-secondary h-8">
                <TabsTrigger value="day" className="text-xs h-6">Dia</TabsTrigger>
                <TabsTrigger value="week" className="text-xs h-6">Semana</TabsTrigger>
                <TabsTrigger value="month" className="text-xs h-6">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeseriesData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="date"
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={value =>
                  formatGranularityTick(value, granularity)
                }
              />
              <YAxis
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={currencyTick}
                width={72}
              />
              <Tooltip content={dualLineTooltip} />
              <Legend
                onClick={o => onLegendToggle((o as any).dataKey)}
                formatter={(value, entry) => {
                  const key = (entry as any)?.dataKey;
                  const isHidden =
                    key === "comissaoPlot"
                      ? !seriesVisibility.comissao
                      : key === "liquidoPlot"
                        ? !seriesVisibility.liquido
                        : false;
                  return legendFormatter(value, entry, isHidden);
                }}
              />
              <Line
                type="monotone"
                dataKey="comissaoPlot"
                name="Comissão"
                stroke="#22c55e"
                dot={false}
                strokeWidth={2}
                hide={!seriesVisibility.comissao}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="liquidoPlot"
                name="Líquido"
                stroke="#6366f1"
                dot={false}
                strokeWidth={2}
                hide={!seriesVisibility.liquido}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              {necessarioPorDia && granularity === "day" ? (
                <ReferenceLine
                  y={necessarioPorDia}
                  stroke="#f97316"
                  strokeDasharray="4 4"
                  label={{
                    value: "Meta/dia",
                    position: "insideTopLeft",
                    fill: "#f97316",
                    fontSize: 11,
                  }}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Distribuição por Etapa do Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {stageData.length === 0 ? (
              <EmptyChart
                message="Sem dados de pipeline para este recorte."
                onClearFilters={onClearFilters}
              />
            ) : (
              <BarChart data={stageData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="etapa"
                  stroke={axisColor}
                  tick={{ fill: axisColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => shortLabel(v, 14)}
                />
                <YAxis
                  stroke={axisColor}
                  tick={{ fill: axisColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => formatCurrency(v)}
                  width={72}
                />
                <Tooltip content={dualBarTooltip} />
                <Legend
                  onClick={o => onLegendToggle((o as any).dataKey)}
                  formatter={(value, entry) => {
                    const key = (entry as any)?.dataKey;
                    const isHidden =
                      key === "comissaoPlot"
                        ? !seriesVisibility.comissao
                        : key === "liquidoPlot"
                          ? !seriesVisibility.liquido
                          : key === "liquidoSem"
                            ? !seriesVisibility.liquidoSem
                            : false;
                    return legendFormatter(value, entry, isHidden);
                  }}
                />
                <Bar
                  dataKey="comissaoPlot"
                  name="Comissão"
                  fill="#22c55e"
                  radius={[3, 3, 0, 0]}
                  cursor="pointer"
                  hide={!seriesVisibility.comissao}
                  onClick={data => onStageClick((data as any).etapa)}
                />
                <Bar
                  dataKey="liquidoPlot"
                  name="Líquido"
                  fill="#6366f1"
                  radius={[3, 3, 0, 0]}
                  cursor="pointer"
                  hide={!seriesVisibility.liquido}
                  onClick={data => onStageClick((data as any).etapa)}
                />
                <Bar
                  dataKey="liquidoSem"
                  name="Líquido sem comissão"
                  fill="rgba(255,255,255,0.18)"
                  radius={[3, 3, 0, 0]}
                  cursor="pointer"
                  stackId="sem"
                  hide={!seriesVisibility.liquidoSem}
                  onClick={data => onStageClick((data as any).etapa)}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
