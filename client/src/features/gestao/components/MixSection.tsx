import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyChart } from "./EmptyChart";
import { formatCurrency, formatPercent, shortLabel, tooltipBox } from "../utils";

type SeriesVisibility = { comissao: boolean; liquido: boolean; liquidoSem: boolean };

type MixSectionProps = {
  productData: Array<any>;
  operationData: Array<any>;
  seriesVisibility: SeriesVisibility;
  onLegendToggle: (dataKey?: string) => void;
  onProductClick: (produto: string) => void;
  onOperationClick: (tipoOperacao: string) => void;
  onClearFilters: () => void;
};

export function MixSection({
  productData,
  operationData,
  seriesVisibility,
  onLegendToggle,
  onProductClick,
  onOperationClick,
  onClearFilters,
}: MixSectionProps) {
  const mixProductTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    const pct = item?.liquido > 0 ? item.comissao / item.liquido : 0;
    return tooltipBox(item?.produto, [
      { label: "Comissão", value: formatCurrency(item?.comissao ?? 0), emphasis: true },
      { label: "Líquido", value: formatCurrency(item?.liquido ?? 0) },
      { label: "Contratos", value: String(item?.count ?? 0) },
      { label: "Comissão média", value: formatPercent(pct) },
    ]);
  };

  const mixOperationTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    const pct = item?.liquido > 0 ? item.comissao / item.liquido : 0;
    return tooltipBox(item?.tipoOperacao, [
      { label: "Comissão", value: formatCurrency(item?.comissao ?? 0), emphasis: true },
      { label: "Líquido", value: formatCurrency(item?.liquido ?? 0) },
      { label: "Contratos", value: String(item?.count ?? 0) },
      { label: "Comissão média", value: formatPercent(pct) },
    ]);
  };

  const gridColor = "rgba(255,255,255,0.06)";
  const axisColor = "rgba(255,255,255,0.35)";
  const legendFmt = (value: string, entry: any, isHidden: boolean) => (
    <span className={`text-xs ${isHidden ? "text-muted-foreground/50 line-through" : "text-foreground/80"}`}>
      {value}
    </span>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Mix por Produto</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {productData.length === 0 ? (
              <EmptyChart message="Sem dados de produto para este recorte." onClearFilters={onClearFilters} />
            ) : (
              <BarChart data={productData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke={gridColor} vertical={false} />
                <XAxis dataKey="produto" stroke={axisColor} tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => shortLabel(v, 14)} />
                <YAxis stroke={axisColor} tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} width={72} />
                <Tooltip content={mixProductTooltip} />
                <Legend
                  onClick={(o) => onLegendToggle((o as any).dataKey)}
                  formatter={(value, entry) => {
                    const key = (entry as any)?.dataKey;
                    const isHidden =
                      key === "comissaoPlot" ? !seriesVisibility.comissao
                      : key === "liquidoPlot" ? !seriesVisibility.liquido
                      : key === "liquidoSem" ? !seriesVisibility.liquidoSem
                      : false;
                    return legendFmt(value, entry, isHidden);
                  }}
                />
                <Bar dataKey="comissaoPlot" name="Comissão" fill="#22c55e" radius={[3,3,0,0]} cursor="pointer" hide={!seriesVisibility.comissao} onClick={(data) => onProductClick((data as any).produto)} />
                <Bar dataKey="liquidoPlot" name="Líquido" fill="#6366f1" radius={[3,3,0,0]} cursor="pointer" hide={!seriesVisibility.liquido} onClick={(data) => onProductClick((data as any).produto)} />
                <Bar dataKey="liquidoSem" name="Líquido sem comissão" fill="rgba(255,255,255,0.18)" radius={[3,3,0,0]} cursor="pointer" stackId="semProd" hide={!seriesVisibility.liquidoSem} onClick={(data) => onProductClick((data as any).produto)} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Mix por Tipo de Operação</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {operationData.length === 0 ? (
              <EmptyChart message="Sem dados de tipo de operação para este recorte." onClearFilters={onClearFilters} />
            ) : (
              <BarChart data={operationData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke={gridColor} vertical={false} />
                <XAxis dataKey="tipoOperacao" stroke={axisColor} tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => shortLabel(v, 16)} />
                <YAxis stroke={axisColor} tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} width={72} />
                <Tooltip content={mixOperationTooltip} />
                <Legend
                  onClick={(o) => onLegendToggle((o as any).dataKey)}
                  formatter={(value, entry) => {
                    const key = (entry as any)?.dataKey;
                    const isHidden =
                      key === "comissaoPlot" ? !seriesVisibility.comissao
                      : key === "liquidoPlot" ? !seriesVisibility.liquido
                      : key === "liquidoSem" ? !seriesVisibility.liquidoSem
                      : false;
                    return legendFmt(value, entry, isHidden);
                  }}
                />
                <Bar dataKey="comissaoPlot" name="Comissão" fill="#22c55e" radius={[3,3,0,0]} cursor="pointer" hide={!seriesVisibility.comissao} onClick={(data) => onOperationClick((data as any).tipoOperacao)} />
                <Bar dataKey="liquidoPlot" name="Líquido" fill="#6366f1" radius={[3,3,0,0]} cursor="pointer" hide={!seriesVisibility.liquido} onClick={(data) => onOperationClick((data as any).tipoOperacao)} />
                <Bar dataKey="liquidoSem" name="Líquido sem comissão" fill="rgba(255,255,255,0.18)" radius={[3,3,0,0]} cursor="pointer" stackId="semOp" hide={!seriesVisibility.liquidoSem} onClick={(data) => onOperationClick((data as any).tipoOperacao)} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
