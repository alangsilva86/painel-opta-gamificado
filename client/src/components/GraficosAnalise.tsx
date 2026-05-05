import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { TrendingUp, Package, Zap } from "lucide-react";

interface ProdutoData {
  nome: string;
  totalContratos: number;
  totalComissao: number;
  comissaoMedia: number;
  percentualTotal: number;
}

interface PipelineData {
  estagio: string;
  totalContratos: number;
  totalValor: number;
  percentualPipeline?: number;
}

interface GraficosAnaliseProps {
  produtos: ProdutoData[];
  pipeline: PipelineData[];
  totalComissao: number;
  totalValorPipeline: number;
}

const CORES_PRODUTOS = [
  "var(--chart-2)",
  "var(--chart-6)",
  "var(--chart-4)",
  "var(--chart-3)",
  "var(--chart-1)",
  "var(--chart-5)",
];

const CORES_PIPELINE = [
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-6)",
];

const chartConfig = {
  comissao: { label: "Incentivo", color: "var(--chart-2)" },
  value: { label: "Valor", color: "var(--chart-1)" },
};

export function GraficosAnalise({ produtos, pipeline, totalComissao, totalValorPipeline }: GraficosAnaliseProps) {
  const [productSeriesVisible, setProductSeriesVisible] = useState(true);
  const [hiddenPipelineStages, setHiddenPipelineStages] = useState<Set<string>>(new Set());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const produtosGrafico = produtos.map((p) => ({
    name: p.nome,
    contratos: p.totalContratos,
    comissao: p.totalComissao,
  }));

  const totalValor = totalValorPipeline || pipeline.reduce((acc, p) => acc + p.totalValor, 0);
  const pipelineGrafico = pipeline.map((p) => ({
    name: p.estagio,
    value: p.totalValor,
    contratos: p.totalContratos,
    percentual: totalValor > 0 ? (p.totalValor / totalValor) * 100 : 0,
  }));

  const pipelineColors = new Map<string, string>();
  pipelineGrafico.forEach((item, idx) => {
    pipelineColors.set(item.name, CORES_PIPELINE[idx % CORES_PIPELINE.length]);
  });

  const pipelineDisplay = pipelineGrafico.map((item) =>
    hiddenPipelineStages.has(item.name) ? { ...item, value: 0 } : item
  );

  const togglePipelineStage = (stage?: string) => {
    if (!stage) return;
    setHiddenPipelineStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="panel-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label mb-1">Incentivo Total</p>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalComissao)}</p>
              </div>
              <TrendingUp className="h-7 w-7 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="panel-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label mb-1">Produtos</p>
                <p className="text-2xl font-bold tabular-nums">{produtos.length}</p>
              </div>
              <Package className="h-7 w-7 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="panel-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label mb-1">Pipeline</p>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalValorPipeline)}</p>
              </div>
              <Zap className="h-7 w-7 text-warning/70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produtos por Comissão */}
        <Card className="panel-card">
          <CardHeader>
            <CardTitle className="heading-card flex items-center gap-2">
              <Package size={18} className="text-primary/70" />
              Produtos Mais Rentáveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {produtos.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={produtosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={formatCurrency}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                    }
                  />
                  <Legend
                    onClick={() => setProductSeriesVisible((prev) => !prev)}
                    formatter={(value) => (
                      <span className={`text-xs ${productSeriesVisible ? "text-foreground" : "text-muted-foreground line-through"}`}>
                        {value} · clique para esconder/mostrar
                      </span>
                    )}
                  />
                  <Bar
                    dataKey="comissao"
                    fill="var(--chart-2)"
                    name="Incentivo"
                    hide={!productSeriesVisible}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Pipeline por Estágio */}
        <Card className="panel-card">
          <CardHeader>
            <CardTitle className="heading-card flex items-center gap-2">
              <Zap size={18} className="text-warning/70" />
              Pipeline por Estágio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pipeline.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <PieChart>
                  <Pie
                    data={pipelineDisplay}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      percent > 0 ? `${name} (${(percent * 100).toFixed(0)}%)` : ""
                    }
                    outerRadius={80}
                    dataKey="value"
                  >
                    {pipelineDisplay.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={pipelineColors.get(entry.name) ?? CORES_PIPELINE[index % CORES_PIPELINE.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                    }
                  />
                  <Legend
                    onClick={(item) =>
                      togglePipelineStage(
                        (item as any)?.value ??
                          (item as any)?.payload?.name ??
                          (item as any)?.payload?.payload?.name
                      )
                    }
                    formatter={(value) => {
                      const label = String(value);
                      const isHidden = hiddenPipelineStages.has(label);
                      return (
                        <span className={`text-xs ${isHidden ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {label} · clique para esconder/mostrar
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Produtos */}
      <Card className="panel-card">
        <CardHeader>
          <CardTitle className="heading-card">Detalhes dos Produtos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-shell">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Contratos</TableHead>
                  <TableHead className="text-right">Incentivo Total</TableHead>
                  <TableHead className="text-right">Incentivo Médio</TableHead>
                  <TableHead className="text-right">% Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: CORES_PRODUTOS[idx % CORES_PRODUTOS.length] }}
                        />
                        <span className="font-medium">{produto.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{produto.totalContratos}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(produto.totalComissao)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(produto.comissaoMedia)}</TableCell>
                    <TableCell className="text-right">
                      <span className="status-pill border-primary/25 bg-primary/10 text-primary">
                        {produto.percentualTotal.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Pipeline */}
      <Card className="panel-card">
        <CardHeader>
          <CardTitle className="heading-card">Detalhes do Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-shell">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estágio</TableHead>
                  <TableHead className="text-right">Contratos</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">% Pipeline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipeline.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: CORES_PIPELINE[idx % CORES_PIPELINE.length] }}
                        />
                        <span className="font-medium">{item.estagio}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.totalContratos}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(item.totalValor)}</TableCell>
                    <TableCell className="text-right">
                      <span className="status-pill border-info/25 bg-info/10 text-info">
                        {((item.percentualPipeline ?? (item as any).percentual ?? 0)).toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
