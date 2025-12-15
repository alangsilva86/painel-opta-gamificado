import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ScatterChart, Scatter } from "recharts";
import { FilterState } from "../useGestaoFilters";
import { formatCurrency, formatPercent, shortLabel, tooltipBox } from "../utils";

type SeriesVisibility = { comissao: boolean; liquido: boolean };

type LeversSectionProps = {
  bySeller: Array<any>;
  byProduct: Array<any>;
  filterState: FilterState;
  seriesVisibility: SeriesVisibility;
  onLegendToggle: (dataKey?: string) => void;
  onSellerClick: (vendedor: string) => void;
  onProductClick: (produto: string) => void;
};

export function LeversSection({
  bySeller,
  byProduct,
  filterState,
  seriesVisibility,
  onLegendToggle,
  onSellerClick,
  onProductClick,
}: LeversSectionProps) {
  const paretoData = bySeller
    .slice()
    .sort((a, b) => b.comissao - a.comissao)
    .map((item, idx, arr) => {
      const total = arr.reduce((acc, it) => acc + it.comissao, 0);
      const cum = arr.slice(0, idx + 1).reduce((acc, it) => acc + it.comissao, 0);
      return { ...item, cumulativo: total > 0 ? (cum / total) * 100 : 0 };
    });

  const scatterTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return tooltipBox(p.produto, [
      { label: "Ticket", value: formatCurrency(p.ticket) },
      { label: "Comissão média", value: formatPercent(p.takeRate) },
    ]);
  };

  const scatterData = byProduct.map((p) => ({
    produto: p.produto,
    ticket: p.count > 0 ? p.liquido / p.count : 0,
    takeRate: p.takeRate,
    liquido: p.liquido,
    fill: filterState.produto.includes(p.produto) ? "#22c55e" : "#8b5cf6",
  }));

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
                onClick={(o) => onLegendToggle((o as any).dataKey)}
                formatter={(value) => (
                  <span className="text-slate-200 text-xs">
                    {value} · clique para esconder/mostrar
                  </span>
                )}
              />
              <Bar
                yAxisId="left"
                dataKey="comissao"
                name="Comissão"
                fill="#22c55e"
                onClick={(data) => onSellerClick((data as any).vendedor)}
                cursor="pointer"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativo"
                name="Cumulativo %"
                stroke="#f97316"
                dot={false}
                strokeWidth={2}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <CardTitle>Scatter: Comissão Média x Ticket (Produto)</CardTitle>
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
              <Scatter data={scatterData} name="Produto" onClick={(data) => onProductClick((data as any).produto)} />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
