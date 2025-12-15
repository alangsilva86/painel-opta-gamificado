import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyChart } from "./EmptyChart";
import { formatCurrency, formatPercent, shortLabel, tooltipBox } from "../utils";

type SeriesVisibility = { comissao: boolean; liquido: boolean };

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

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <CardTitle>Mix por Produto</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {productData.length === 0 ? (
              <EmptyChart message="Sem dados de produto para este recorte." onClearFilters={onClearFilters} />
            ) : (
              <BarChart data={productData}>
                <CartesianGrid strokeDasharray="2 4" stroke="#1f2937" />
                <XAxis dataKey="produto" stroke="#9ca3af" tickFormatter={(v) => shortLabel(v, 14)} />
                <YAxis stroke="#9ca3af" tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip content={mixProductTooltip} />
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
                  onClick={(data) => onProductClick((data as any).produto)}
                />
                <Bar
                  dataKey="liquidoPlot"
                  name="Líquido"
                  fill="#3b82f6"
                  cursor="pointer"
                  hide={!seriesVisibility.liquido}
                  onClick={(data) => onProductClick((data as any).produto)}
                />
                <Bar
                  dataKey="liquidoSem"
                  name="Líquido sem comissão"
                  fill="#9ca3af"
                  cursor="pointer"
                  stackId="semProd"
                  onClick={(data) => onProductClick((data as any).produto)}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <CardTitle>Mix por Tipo de Operação</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {operationData.length === 0 ? (
              <EmptyChart message="Sem dados de tipo de operação para este recorte." onClearFilters={onClearFilters} />
            ) : (
              <BarChart data={operationData}>
                <CartesianGrid strokeDasharray="2 4" stroke="#1f2937" />
                <XAxis dataKey="tipoOperacao" stroke="#9ca3af" tickFormatter={(v) => shortLabel(v, 16)} />
                <YAxis stroke="#9ca3af" tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip content={mixOperationTooltip} />
                <Legend onClick={(o) => onLegendToggle((o as any).dataKey)} />
                <Bar
                  dataKey="comissaoPlot"
                  name="Comissão"
                  fill="#22c55e"
                  cursor="pointer"
                  hide={!seriesVisibility.comissao}
                  onClick={(data) => onOperationClick((data as any).tipoOperacao)}
                />
                <Bar
                  dataKey="liquidoPlot"
                  name="Líquido"
                  fill="#3b82f6"
                  cursor="pointer"
                  hide={!seriesVisibility.liquido}
                  onClick={(data) => onOperationClick((data as any).tipoOperacao)}
                />
                <Bar
                  dataKey="liquidoSem"
                  name="Líquido sem comissão"
                  fill="#9ca3af"
                  cursor="pointer"
                  stackId="semOp"
                  onClick={(data) => onOperationClick((data as any).tipoOperacao)}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
