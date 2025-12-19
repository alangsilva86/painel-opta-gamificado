import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ScatterChart, Scatter } from "recharts";
import { FilterState } from "../useGestaoFilters";
import { formatCurrency, formatPercent, shortLabel, tooltipBox } from "../utils";

type LeversSectionProps = {
  bySeller: Array<any>;
  byProduct: Array<any>;
  byProductOperation?: Array<any>;
  filterState: FilterState;
  onSellerClick: (vendedor: string) => void;
  onProductOperationClick?: (produto: string, tipoOperacao: string) => void;
  onProductClick?: (produto: string) => void;
};

export function LeversSection({
  bySeller,
  byProduct,
  byProductOperation,
  filterState,
  onSellerClick,
  onProductOperationClick,
  onProductClick,
}: LeversSectionProps) {
  const [paretoVisibility, setParetoVisibility] = useState({ comissao: true, cumulativo: true });
  const [scatterVisible, setScatterVisible] = useState(true);

  const handleParetoLegendToggle = (dataKey?: string) => {
    if (dataKey === "comissao" || dataKey === "cumulativo") {
      setParetoVisibility((prev) => ({ ...prev, [dataKey]: !prev[dataKey] }));
    }
  };

  const handleScatterLegendToggle = () => {
    setScatterVisible((prev) => !prev);
  };

  const paretoData = bySeller
    .slice()
    .sort((a, b) => b.comissao - a.comissao)
    .map((item, idx, arr) => {
      const total = arr.reduce((acc, it) => acc + it.comissao, 0);
      const cum = arr.slice(0, idx + 1).reduce((acc, it) => acc + it.comissao, 0);
      return { ...item, cumulativo: total > 0 ? (cum / total) * 100 : 0 };
    });

  const anyProductFilter = filterState.produto.length > 0;
  const anyOperationFilter = filterState.tipoOperacao.length > 0;
  const useProductOperation = (byProductOperation?.length ?? 0) > 0;

  const scatterData = useProductOperation
    ? byProductOperation.flatMap((group) => {
        const produto = group.produto ?? "Sem produto";
        return (group.operations ?? []).map((op: any) => {
          const tipoOperacao = op.tipoOperacao ?? "Sem operação";
          const matchesProduct = filterState.produto.includes(produto);
          const matchesOperation = filterState.tipoOperacao.includes(tipoOperacao);
          const matches =
            (!anyProductFilter || matchesProduct) && (!anyOperationFilter || matchesOperation);
          const isActive = (anyProductFilter || anyOperationFilter) && matches;
          return {
            produto,
            tipoOperacao,
            label: `${produto} · ${tipoOperacao}`,
            ticket: op.count > 0 ? op.liquido / op.count : 0,
            takeRate: op.takeRate,
            liquido: op.liquido,
            fill: isActive ? "#22c55e" : "#8b5cf6",
          };
        });
      })
    : byProduct.map((p) => ({
        produto: p.produto,
        label: p.produto,
        ticket: p.count > 0 ? p.liquido / p.count : 0,
        takeRate: p.takeRate,
        liquido: p.liquido,
        fill: filterState.produto.includes(p.produto) ? "#22c55e" : "#8b5cf6",
      }));

  const scatterTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    const title = p.label ?? p.produto;
    return tooltipBox(title, [
      { label: "Ticket", value: formatCurrency(p.ticket) },
      { label: "Comissão média", value: formatPercent(p.takeRate) },
    ]);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <CardTitle>Pareto Vendedores (Comissão)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={paretoData}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1f2937" />
              <XAxis dataKey="vendedor" stroke="#9ca3af" tickFormatter={(v) => shortLabel(v, 12)} />
              <YAxis yAxisId="left" stroke="#9ca3af" tickFormatter={(v) => formatCurrency(v)} />
              <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip
                content={({ payload }) => {
                  if (!payload || payload.length === 0) return null;
                  const item = payload[0]?.payload;
                  return tooltipBox(item?.vendedor, [
                    { label: "Comissão", value: formatCurrency(item?.comissao ?? 0), emphasis: true },
                    { label: "Comissão média", value: formatPercent(item?.takeRate ?? 0) },
                    { label: "Cumulativo", value: `${(item?.cumulativo ?? 0).toFixed(1)}%` },
                  ]);
                }}
              />
              <Legend
                onClick={(o) => handleParetoLegendToggle((o as any).dataKey)}
                formatter={(value, entry) => {
                  const key = (entry as any)?.dataKey;
                  const isHidden =
                    key === "comissao" ? !paretoVisibility.comissao : key === "cumulativo" ? !paretoVisibility.cumulativo : false;
                  return (
                    <span className={`text-xs ${isHidden ? "text-slate-500 line-through" : "text-slate-200"}`}>
                      {value} · clique para esconder/mostrar
                    </span>
                  );
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="comissao"
                name="Comissão"
                fill="#22c55e"
                onClick={(data) => onSellerClick((data as any).vendedor)}
                cursor="pointer"
                hide={!paretoVisibility.comissao}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativo"
                name="Cumulativo %"
                stroke="#f97316"
                dot={false}
                strokeWidth={2}
                hide={!paretoVisibility.cumulativo}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <CardTitle>Scatter: Comissão Média x Ticket (Produto + Operação)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                type="number"
                dataKey="ticket"
                name="Ticket"
                stroke="#9ca3af"
                tickFormatter={(v) => formatCurrency(v)}
              />
              <YAxis
                type="number"
                dataKey="takeRate"
                name="Comissão média"
                stroke="#9ca3af"
                tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
                domain={[0, (dataMax: number) => (dataMax ? dataMax * 1.1 : 0.05)]}
              />
              <Tooltip content={scatterTooltip} />
              <Legend
                onClick={handleScatterLegendToggle}
                formatter={(value) => (
                  <span className={`text-xs ${scatterVisible ? "text-slate-200" : "text-slate-500 line-through"}`}>
                    {value} · clique para esconder/mostrar
                  </span>
                )}
              />
              <Scatter
                data={scatterData}
                name="Produto + Operação"
                fill="#8b5cf6"
                hide={!scatterVisible}
                onClick={(data) => {
                  const payload = (data as any) ?? {};
                  if (payload.tipoOperacao && onProductOperationClick) {
                    onProductOperationClick(payload.produto, payload.tipoOperacao);
                  } else if (payload.produto && onProductClick) {
                    onProductClick(payload.produto);
                  }
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
