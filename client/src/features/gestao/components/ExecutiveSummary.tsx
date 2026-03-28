import { AlertTriangle, CheckCircle2, Siren, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "../utils";
import type { GestaoResumoData } from "../types";

type InsightSeverity = "info" | "warning" | "critical";

type Insight = {
  id: string;
  severity: InsightSeverity;
  text: string;
};

function getSeverityIcon(severity: InsightSeverity) {
  if (severity === "critical")
    return <Siren size={16} className="text-red-300" />;
  if (severity === "warning")
    return <AlertTriangle size={16} className="text-amber-300" />;
  return <CheckCircle2 size={16} className="text-emerald-300" />;
}

export function generateInsights(
  data: GestaoResumoData,
  prev?: GestaoResumoData | null
): Insight[] {
  const insights: Insight[] = [];

  const bestSeller = [...data.bySeller].sort(
    (a, b) => b.comissao - a.comissao
  )[0];
  if (bestSeller) {
    const prevSeller = prev?.bySeller.find(
      seller => seller.vendedor === bestSeller.vendedor
    );
    const sellerDelta =
      prevSeller && prevSeller.comissao > 0
        ? ` (${prevSeller ? `${bestSeller.comissao >= prevSeller.comissao ? "+" : ""}${formatPercent((bestSeller.comissao - prevSeller.comissao) / prevSeller.comissao)}` : ""} vs anterior)`
        : "";
    insights.push({
      id: "best-seller",
      severity: "info",
      text: `${bestSeller.vendedor} lidera com ${formatCurrency(bestSeller.comissao)}${sellerDelta}.`,
    });
  }

  const topProduct = [...data.byProduct].sort(
    (a, b) => b.comissao - a.comissao
  )[0];
  if (topProduct && data.cards.comissao > 0) {
    insights.push({
      id: "top-product",
      severity: "info",
      text: `${topProduct.produto} concentra ${formatPercent(topProduct.comissao / data.cards.comissao)} da comissão.`,
    });
  }

  if (
    prev?.cards.takeRate &&
    data.cards.takeRate < prev.cards.takeRate * 0.92
  ) {
    insights.push({
      id: "take-rate-down",
      severity: "warning",
      text: `Taxa de comissão caiu para ${formatPercent(data.cards.takeRate)} frente a ${formatPercent(prev.cards.takeRate)} no período comparado.`,
    });
  }

  const pace = data.cards.paceComissao ?? 0;
  const needed = data.cards.necessarioPorDia ?? 0;
  if (needed > 0) {
    insights.push({
      id: "pace",
      severity: pace >= needed ? "info" : "warning",
      text:
        pace >= needed
          ? `Ritmo atual ${formatCurrency(pace)}/dia, acima do necessário (${formatCurrency(needed)}/dia).`
          : `Ritmo atual ${formatCurrency(pace)}/dia, abaixo do necessário (${formatCurrency(needed)}/dia).`,
    });
  }

  if ((data.cards.metaComissao ?? 0) > 0) {
    const pctMeta = data.cards.comissao / Math.max(1, data.cards.metaComissao);
    const falta = Math.max(
      0,
      (data.cards.metaComissao ?? 0) - data.cards.comissao
    );
    insights.push({
      id: "meta-comissao",
      severity: pctMeta >= 1 ? "info" : pctMeta >= 0.8 ? "warning" : "critical",
      text:
        falta === 0
          ? `Meta de comissão atingida com ${formatPercent(pctMeta)} de execução.`
          : `${formatPercent(pctMeta)} da meta atingida; faltam ${formatCurrency(falta)}.`,
    });
  }

  const firstAlert = data.alerts[0];
  if (firstAlert) {
    insights.push({
      id: `alert-${firstAlert.type}`,
      severity: firstAlert.severity,
      text: firstAlert.detail,
    });
  }

  return insights.slice(0, 5);
}

export function ExecutiveSummary({
  data,
  comparisonData,
}: {
  data: GestaoResumoData;
  comparisonData?: GestaoResumoData | null;
}) {
  const insights = generateInsights(data, comparisonData);

  return (
    <Card className="bg-slate-950 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp size={18} />
          Resumo Executivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map(insight => (
          <div
            key={insight.id}
            className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-3 text-sm text-slate-200"
          >
            {getSeverityIcon(insight.severity)}
            <p>{insight.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
