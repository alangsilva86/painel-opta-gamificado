import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from "recharts";
import { formatCurrency, formatDateTick, formatPercent, shortLabel, tooltipBox } from "../utils";
import { EmptyChart } from "./EmptyChart";

type SeriesVisibility = { comissao: boolean; liquido: boolean };

type HealthPipelineSectionProps = {
  timeseriesData: Array<any>;
  stageData: Array<any>;
  seriesVisibility: SeriesVisibility;
  onLegendToggle: (dataKey?: string) => void;
  necessarioPorDia?: number | null;
  onStageClick: (etapa: string) => void;
  onClearFilters: () => void;
};

export function HealthPipelineSection({
  timeseriesData,
  stageData,
  seriesVisibility,
  onLegendToggle,
  necessarioPorDia,
  onStageClick,
  onClearFilters,
}: HealthPipelineSectionProps) {
  const currencyTick = (v: number) => formatCurrency(v);

  const dualLineTooltip = ({ label, payload }: any) => {
    if (!payload || payload.length === 0) return null;
    const date = label ? formatDateTick(label) : "";
    const item = payload[0]?.payload;
    return tooltipBox(date, [
      ...(seriesVisibility.comissao
        ? [{ label: "Comissão", value: formatCurrency(item?.comissaoPlot ?? item?.comissao ?? 0), emphasis: true }]
        : []),
      ...(seriesVisibility.liquido
        ? [{ label: "Líquido", value: formatCurrency(item?.liquidoPlot ?? item?.liquido ?? 0) }]
        : []),
      { label: "Contratos sem comissão", value: String(item?.contratosSemComissao ?? 0) },
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
        ? [{ label: "Comissão", value: formatCurrency(comissaoVal), emphasis: true }]
        : []),
      ...(seriesVisibility.liquido
        ? [{ label: "Líquido", value: formatCurrency(liquidoVal) }]
        : []),
      ...(item?.liquidoSem !== undefined
        ? [{ label: "Líquido sem comissão", value: formatCurrency(item.liquidoSem) }]
        : []),
      ...(item?.count !== undefined ? [{ label: "Contratos", value: String(item.count) }] : []),
      ...(item?.semComissaoCount !== undefined
        ? [{ label: "Sem comissão", value: String(item.semComissaoCount) }]
        : []),
      { label: "Comissão média", value: formatPercent(takeRateVal) },
    ]);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <CardTitle>Série temporal (Comissão x Líquido)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeseriesData}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1f2937" />
              <XAxis dataKey="date" stroke="#9ca3af" tickFormatter={formatDateTick} />
              <YAxis stroke="#9ca3af" tickFormatter={currencyTick} />
              <Tooltip content={dualLineTooltip} />
              <Legend onClick={(o) => onLegendToggle((o as any).dataKey)} />
              <Line
                type="monotone"
                dataKey="comissaoPlot"
                name="Comissão"
                stroke="#22c55e"
                dot={false}
                strokeWidth={2}
                hide={!seriesVisibility.comissao}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="liquidoPlot"
                name="Líquido"
                stroke="#3b82f6"
                dot={false}
                strokeWidth={2}
                hide={!seriesVisibility.liquido}
                activeDot={{ r: 4 }}
              />
              {necessarioPorDia ? (
                <ReferenceLine
                  y={necessarioPorDia}
                  stroke="#f97316"
                  strokeDasharray="4 4"
                  label={{ value: "Necessário/dia", position: "left", fill: "#f97316", fontSize: 12 }}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <CardTitle>Pipeline por Etapa</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {stageData.length === 0 ? (
              <EmptyChart message="Sem dados de pipeline para este recorte." onClearFilters={onClearFilters} />
            ) : (
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="2 4" stroke="#1f2937" />
                <XAxis dataKey="etapa" stroke="#9ca3af" tickFormatter={(v) => shortLabel(v, 14)} />
                <YAxis stroke="#9ca3af" tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip content={dualBarTooltip} />
                <Legend
                  onClick={(o) => onLegendToggle((o as any).dataKey)}
                  formatter={(value) => (
                    <span className="text-slate-200 text-xs">
                      {value} · clique para esconder/mostrar
                    </span>
                  )}
                />
                <Bar
                  dataKey="comissaoPlot"
                  name="Comissão"
                  fill="#22c55e"
                  cursor="pointer"
                  hide={!seriesVisibility.comissao}
                  onClick={(data) => onStageClick((data as any).etapa)}
                />
                <Bar
                  dataKey="liquidoPlot"
                  name="Líquido"
                  fill="#3b82f6"
                  cursor="pointer"
                  hide={!seriesVisibility.liquido}
                  onClick={(data) => onStageClick((data as any).etapa)}
                />
                <Bar
                  dataKey="liquidoSem"
                  name="Líquido sem comissão"
                  fill="#9ca3af"
                  cursor="pointer"
                  stackId="sem"
                  onClick={(data) => onStageClick((data as any).etapa)}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
