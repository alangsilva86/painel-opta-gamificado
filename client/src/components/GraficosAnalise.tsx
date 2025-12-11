import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
];

const CORES_PIPELINE = [
  "#6366f1", // indigo
  "#f43f5e", // rose
  "#14b8a6", // teal
  "#f97316", // orange
  "#6b21a8", // violet
];

export function GraficosAnalise({ produtos, pipeline, totalComissao, totalValorPipeline }: GraficosAnaliseProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Preparar dados para gráficos
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

  return (
    <div className="space-y-6">
      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Comissão Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalComissao)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Produtos</p>
                <p className="text-2xl font-bold">{produtos.length}</p>
              </div>
              <Package className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValorPipeline)}</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produtos por Comissão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package size={20} />
              Produtos Mais Rentáveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {produtos.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={produtosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                  />
                  <Bar dataKey="comissao" fill="#3b82f6" name="Comissão" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Pipeline por Estágio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap size={20} />
              Pipeline por Estágio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pipeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pipelineGrafico}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pipelineGrafico.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CORES_PIPELINE[index % CORES_PIPELINE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Produtos */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes dos Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-4 font-semibold">Produto</th>
                  <th className="text-right py-2 px-4 font-semibold">Contratos</th>
                  <th className="text-right py-2 px-4 font-semibold">Comissão Total</th>
                  <th className="text-right py-2 px-4 font-semibold">Comissão Média</th>
                  <th className="text-right py-2 px-4 font-semibold">% Total</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((produto, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CORES_PRODUTOS[idx % CORES_PRODUTOS.length] }}
                        />
                        {produto.nome}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">{produto.totalContratos}</td>
                    <td className="text-right py-3 px-4 font-semibold">{formatCurrency(produto.totalComissao)}</td>
                    <td className="text-right py-3 px-4">{formatCurrency(produto.comissaoMedia)}</td>
                    <td className="text-right py-3 px-4">
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-semibold">
                        {produto.percentualTotal.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-4 font-semibold">Estágio</th>
                  <th className="text-right py-2 px-4 font-semibold">Contratos</th>
                  <th className="text-right py-2 px-4 font-semibold">Valor Total</th>
                  <th className="text-right py-2 px-4 font-semibold">% Pipeline</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.map((item, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CORES_PIPELINE[idx % CORES_PIPELINE.length] }}
                        />
                        {item.estagio}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">{item.totalContratos}</td>
                    <td className="text-right py-3 px-4 font-semibold">{formatCurrency(item.totalValor)}</td>
                    <td className="text-right py-3 px-4">
                      <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded text-xs font-semibold">
                        {((item.percentualPipeline ?? (item as any).percentual ?? 0)).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
