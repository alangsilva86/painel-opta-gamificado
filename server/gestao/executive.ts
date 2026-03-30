type FilterPayload = {
  etapaPipeline?: string[];
  vendedorNome?: string[];
  produto?: string[];
  tipoOperacao?: string[];
};

type ExecutiveStatus = "good" | "warning" | "critical" | "neutral";
type ExecutiveTrend = "up" | "down" | "flat";

type SummaryCards = {
  contratos: number;
  liquido: number;
  comissao: number;
  takeRate: number;
  takeRateLimpo: number;
  ticketMedio: number;
  pctComissaoCalculada: number;
  contratosSemComissao: number;
  metaComissao: number;
  paceComissao: number;
  necessarioPorDia: number;
  diasDecorridos: number;
  totalDias: number;
};

type SummaryTimeseriesPoint = {
  date: string;
  contratos: number;
  contratosSemComissao: number;
  liquido: number;
  comissao: number;
  liquidoComissionado?: number;
  comissaoComissionado?: number;
  takeRate: number;
  takeRateLimpo?: number;
};

type SummaryStageRow = {
  etapa: string;
  count: number;
  semComissaoCount: number;
  comissao: number;
  liquido: number;
  takeRate: number;
};

type SummarySellerRow = {
  vendedor: string;
  count: number;
  semComissaoCount: number;
  comissao: number;
  liquido: number;
  pctMeta?: number;
  pctTotal?: number;
  takeRate: number;
};

type SummaryProductRow = {
  produto: string;
  count: number;
  semComissaoCount: number;
  comissao: number;
  liquido: number;
  takeRate: number;
};

type SummaryOperationRow = {
  tipoOperacao: string;
  count: number;
  semComissaoCount: number;
  comissao: number;
  liquido: number;
  takeRate: number;
};

type ExistingAlert = {
  type: string;
  title: string;
  severity: "info" | "warning" | "critical";
  detail: string;
  filters?: FilterPayload;
  generatedAt?: Date;
};

type BuildExecutiveLayerInput = {
  cards: SummaryCards;
  timeseries: SummaryTimeseriesPoint[];
  byStage: SummaryStageRow[];
  bySeller: SummarySellerRow[];
  byProduct: SummaryProductRow[];
  byOperationType: SummaryOperationRow[];
  alerts: ExistingAlert[];
  latestSyncAt?: Date | null;
  quality: {
    pctLiquidoFallback: number;
    pctComissaoCalculada: number;
    pctSemComissao: number;
    totalRegistros: number;
  };
};

export type ExecutiveMetric = {
  id:
    | "comissaoTotal"
    | "paceVsMeta"
    | "takeRate"
    | "contratos"
    | "shareSemComissao"
    | "concentracaoLider";
  label: string;
  value: number;
  formattedValue: string;
  deltaVsComparison?: number;
  deltaVsTarget?: number;
  targetValue?: number;
  status: ExecutiveStatus;
  trend: ExecutiveTrend;
  isLowerBetter: boolean;
  helpText: string;
  microText: string;
  sparkline: number[];
};

export type ExecutiveNarrativeItem = {
  id: string;
  severity: "info" | "warning" | "critical";
  headline: string;
  whatChanged: string;
  why: string;
  action: string;
  filters?: FilterPayload;
};

export type WatchlistItem = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  impactLabel: string;
  probableCause: string;
  cta: string;
  filters?: FilterPayload;
};

export type FreshnessInfo = {
  lastSyncAt: string | null;
  status: "fresh" | "attention" | "stale" | "unknown";
  label: string;
  detail: string;
};

export type DataQualityInfo = {
  score: number;
  status: ExecutiveStatus;
  label: string;
  pctLiquidoFallback: number;
  pctComissaoCalculada: number;
  pctSemComissao: number;
  totalRegistros: number;
  detail: string;
};

export type BusinessStatus = {
  status: ExecutiveStatus;
  headline: string;
  summary: string;
  actionHint: string;
};

export type ExecutiveLayer = {
  executiveMetrics: ExecutiveMetric[];
  executiveNarrative: ExecutiveNarrativeItem[];
  watchlist: WatchlistItem[];
  freshness: FreshnessInfo;
  dataQuality: DataQualityInfo;
  businessStatus: BusinessStatus;
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function getTrend(values: number[]): ExecutiveTrend {
  if (values.length < 4) return "flat";
  const windowSize = Math.min(3, Math.floor(values.length / 2));
  const previous = average(values.slice(-(windowSize * 2), -windowSize));
  const latest = average(values.slice(-windowSize));
  if (Math.abs(previous) < 0.0001 && Math.abs(latest) < 0.0001) return "flat";
  const delta =
    previous === 0 ? latest : (latest - previous) / Math.abs(previous);
  if (delta > 0.05) return "up";
  if (delta < -0.05) return "down";
  return "flat";
}

function formatRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

function buildFreshness(latestSyncAt?: Date | null): FreshnessInfo {
  if (!latestSyncAt) {
    return {
      lastSyncAt: null,
      status: "unknown",
      label: "Sem histórico de sync",
      detail:
        "Aplique um período para materializar o primeiro recorte executivo.",
    };
  }

  const ageHours = (Date.now() - latestSyncAt.getTime()) / (1000 * 60 * 60);
  if (ageHours <= 4) {
    return {
      lastSyncAt: latestSyncAt.toISOString(),
      status: "fresh",
      label: `Atualizado ${formatRelativeTime(latestSyncAt)}`,
      detail:
        "Carga recente. Os indicadores refletem o recorte sincronizado mais atual.",
    };
  }

  if (ageHours <= 24) {
    return {
      lastSyncAt: latestSyncAt.toISOString(),
      status: "attention",
      label: `Atualizado ${formatRelativeTime(latestSyncAt)}`,
      detail:
        "Dados ainda utilizáveis, mas convém rodar uma nova sincronização antes de decidir.",
    };
  }

  return {
    lastSyncAt: latestSyncAt.toISOString(),
    status: "stale",
    label: `Desatualizado há ${formatRelativeTime(latestSyncAt)}`,
    detail:
      "O recorte está envelhecido para uso executivo. Atualize antes de usar em comitê.",
  };
}

function buildDataQualityInfo(
  input: BuildExecutiveLayerInput["quality"]
): DataQualityInfo {
  const penalty =
    input.pctSemComissao * 250 +
    input.pctLiquidoFallback * 180 +
    input.pctComissaoCalculada * 130;
  const score = clamp(Math.round(100 - penalty), 0, 100);
  const status: ExecutiveStatus =
    score >= 82 ? "good" : score >= 65 ? "warning" : "critical";
  const label =
    status === "good"
      ? "Dados confiáveis"
      : status === "warning"
        ? "Qualidade sob atenção"
        : "Qualidade em risco";

  return {
    score,
    status,
    label,
    pctLiquidoFallback: input.pctLiquidoFallback,
    pctComissaoCalculada: input.pctComissaoCalculada,
    pctSemComissao: input.pctSemComissao,
    totalRegistros: input.totalRegistros,
    detail: `${formatPercent(input.pctLiquidoFallback)} com fallback de líquido, ${formatPercent(
      input.pctComissaoCalculada
    )} com comissão calculada e ${formatPercent(input.pctSemComissao)} sem comissão.`,
  };
}

function getTopSellerShare(rows: SummarySellerRow[], totalCommission: number) {
  if (totalCommission <= 0) return 0;
  const topSeller = rows
    .slice()
    .sort((a, b) => b.comissao - a.comissao)
    [0];
  return topSeller ? topSeller.comissao / totalCommission : 0;
}

function buildMetrics(input: BuildExecutiveLayerInput): ExecutiveMetric[] {
  const { cards, timeseries, bySeller, quality } = input;
  const commissionSparkline = timeseries
    .slice(-12)
    .map(point => point.comissao);
  const paceSparkline = timeseries
    .slice(-12)
    .map((_, index, list) =>
      average(list.slice(0, index + 1).map(point => point.comissao))
    );
  const takeRateSparkline = timeseries.slice(-12).map(point => point.takeRate);
  const contractSparkline = timeseries.slice(-12).map(point => point.contratos);
  const semCommissionSparkline = timeseries
    .slice(-12)
    .map(point =>
      point.contratos > 0 ? point.contratosSemComissao / point.contratos : 0
    );
  const concentrationSparkline = bySeller
    .slice()
    .sort((a, b) => b.comissao - a.comissao)
    .slice(0, 8)
    .map(row => row.comissao);
  const topSeller = bySeller
    .slice()
    .sort((a, b) => b.comissao - a.comissao)[0];
  const topSellerShare = getTopSellerShare(bySeller, cards.comissao);
  const metaProgress =
    cards.metaComissao > 0 ? cards.comissao / cards.metaComissao : undefined;

  return [
    {
      id: "comissaoTotal",
      label: "Comissão total",
      value: cards.comissao,
      formattedValue: formatCurrency(cards.comissao),
      deltaVsTarget:
        cards.metaComissao > 0
          ? (cards.comissao - cards.metaComissao) / cards.metaComissao
          : undefined,
      targetValue: cards.metaComissao || undefined,
      status:
        cards.metaComissao <= 0
          ? "neutral"
          : cards.comissao >= cards.metaComissao
            ? "good"
            : cards.comissao >= cards.metaComissao * 0.85
              ? "warning"
              : "critical",
      trend: getTrend(commissionSparkline),
      isLowerBetter: false,
      helpText: "Soma da comissão total no período filtrado.",
      microText:
        metaProgress !== undefined
          ? `${formatPercent(metaProgress)} da meta de comissão.`
          : "Meta executiva ainda não cadastrada para este mês.",
      sparkline: commissionSparkline,
    },
    {
      id: "paceVsMeta",
      label: "Pace vs necessário/dia",
      value: cards.paceComissao,
      formattedValue: formatCurrency(cards.paceComissao),
      deltaVsTarget:
        cards.necessarioPorDia > 0
          ? (cards.paceComissao - cards.necessarioPorDia) /
            cards.necessarioPorDia
          : undefined,
      targetValue: cards.necessarioPorDia || undefined,
      status:
        cards.necessarioPorDia <= 0
          ? "neutral"
          : cards.paceComissao >= cards.necessarioPorDia
            ? "good"
            : cards.paceComissao >= cards.necessarioPorDia * 0.9
              ? "warning"
              : "critical",
      trend: getTrend(paceSparkline),
      isLowerBetter: false,
      helpText:
        "Comissão média por dia comparada ao ritmo necessário para fechar a meta.",
      microText:
        cards.necessarioPorDia > 0
          ? `Necessário ${formatCurrency(cards.necessarioPorDia)}/dia para fechar o período.`
          : "Sem meta ativa, o pace é apenas informativo.",
      sparkline: paceSparkline,
    },
    {
      id: "takeRate",
      label: "Take rate",
      value: cards.takeRate,
      formattedValue: formatPercent(cards.takeRate),
      deltaVsTarget:
        cards.takeRateLimpo > 0
          ? (cards.takeRate - cards.takeRateLimpo) / cards.takeRateLimpo
          : undefined,
      targetValue: cards.takeRateLimpo || undefined,
      status:
        cards.takeRateLimpo <= 0
          ? "neutral"
          : cards.takeRate >= cards.takeRateLimpo * 0.97
            ? "good"
            : cards.takeRate >= cards.takeRateLimpo * 0.9
              ? "warning"
              : "critical",
      trend: getTrend(takeRateSparkline),
      isLowerBetter: false,
      helpText: "Percentual médio de comissão sobre o líquido liberado.",
      microText: `Take rate limpo de referência: ${formatPercent(
        cards.takeRateLimpo
      )}.`,
      sparkline: takeRateSparkline,
    },
    {
      id: "contratos",
      label: "Contratos",
      value: cards.contratos,
      formattedValue: cards.contratos.toLocaleString("pt-BR"),
      status: cards.contratos > 0 ? "good" : "neutral",
      trend: getTrend(contractSparkline),
      isLowerBetter: false,
      helpText: "Quantidade de contratos dentro do recorte aplicado.",
      microText: `${cards.contratosSemComissao.toLocaleString(
        "pt-BR"
      )} sem comissão dentro do período.`,
      sparkline: contractSparkline,
    },
    {
      id: "shareSemComissao",
      label: "Share sem comissão",
      value: quality.pctSemComissao,
      formattedValue: formatPercent(quality.pctSemComissao),
      deltaVsTarget: (quality.pctSemComissao - 0.05) / 0.05,
      targetValue: 0.05,
      status:
        quality.pctSemComissao <= 0.03
          ? "good"
          : quality.pctSemComissao <= 0.06
            ? "warning"
            : "critical",
      trend: getTrend(semCommissionSparkline),
      isLowerBetter: true,
      helpText:
        "Participação de contratos que ainda não geraram comissão no recorte.",
      microText: "Meta operacional: manter esse share abaixo de 5%.",
      sparkline: semCommissionSparkline,
    },
    {
      id: "concentracaoLider",
      label: "Concentração na líder",
      value: topSellerShare,
      formattedValue: formatPercent(topSellerShare),
      deltaVsTarget: (topSellerShare - 0.3) / 0.3,
      targetValue: 0.3,
      status:
        topSellerShare <= 0.3
          ? "good"
          : topSellerShare <= 0.5
            ? "warning"
            : "critical",
      trend: "flat",
      isLowerBetter: true,
      helpText:
        "Participação da vendedora líder na comissão total do recorte.",
      microText:
        topSeller
          ? `${topSeller.vendedor} concentra ${formatPercent(topSellerShare)} da comissão.`
          : "Ajuda a enxergar dependência excessiva em uma única vendedora.",
      sparkline: concentrationSparkline,
    },
  ];
}

function buildBusinessStatus(
  metrics: ExecutiveMetric[],
  quality: DataQualityInfo,
  cards: SummaryCards
): BusinessStatus {
  const criticalCount = metrics.filter(
    metric => metric.status === "critical"
  ).length;
  const warningCount = metrics.filter(
    metric => metric.status === "warning"
  ).length;
  const paceMetric = metrics.find(metric => metric.id === "paceVsMeta");

  if (criticalCount >= 2 || quality.status === "critical") {
    return {
      status: "critical",
      headline: "Risco executivo alto",
      summary: `A operação pede intervenção: pace em ${cards.paceComissao > 0 ? formatCurrency(cards.paceComissao) : "R$ 0,00"}/dia, qualidade ${quality.label.toLowerCase()}.`,
      actionHint:
        "Abra os drivers de variação e ataque primeiro o volume sem comissão e a rentabilidade pressionada.",
    };
  }

  if (warningCount >= 2 || paceMetric?.status === "warning") {
    return {
      status: "warning",
      headline: "Risco moderado sob controle",
      summary: `O negócio segue viável, mas com desvios que exigem monitoramento diário até o fechamento do período.`,
      actionHint:
        "Acompanhe os blocos de drivers e a watchlist para corrigir o gap antes de escalar.",
    };
  }

  return {
    status: "good",
    headline:
      cards.metaComissao > 0 && cards.comissao >= cards.metaComissao
        ? "Acima da meta com boa leitura"
        : "Em linha com o plano",
    summary:
      "A leitura executiva está consistente entre meta, ritmo e qualidade do recorte.",
    actionHint:
      "Use os diagnósticos para expandir margem ou redistribuir foco sem perder qualidade.",
  };
}

function buildNarrative(
  input: BuildExecutiveLayerInput,
  dataQuality: DataQualityInfo
): ExecutiveNarrativeItem[] {
  const { cards, byStage, bySeller, byProduct, quality } = input;
  const items: ExecutiveNarrativeItem[] = [];
  const pctMeta =
    cards.metaComissao > 0 ? cards.comissao / cards.metaComissao : 0;
  const worstStage = byStage
    .slice()
    .sort((a, b) => b.semComissaoCount - a.semComissaoCount)[0];
  const lowRentabilityProduct = byProduct
    .filter(product => product.liquido > 0)
    .slice()
    .sort((a, b) => b.liquido - a.liquido)
    .find(product => product.takeRate < cards.takeRate * 0.85);
  const topSeller = bySeller
    .slice()
    .sort((a, b) => b.comissao - a.comissao)[0];
  const topSellerShare = getTopSellerShare(bySeller, cards.comissao);

  items.push({
    id: "meta-pace",
    severity:
      cards.necessarioPorDia > 0 && cards.paceComissao < cards.necessarioPorDia
        ? "warning"
        : "info",
    headline:
      cards.metaComissao > 0 && cards.comissao >= cards.metaComissao
        ? "Meta sob controle"
        : "Meta ainda em disputa",
    whatChanged:
      cards.metaComissao > 0
        ? `Executamos ${formatCurrency(cards.comissao)} (${formatPercent(pctMeta)}) da meta no recorte.`
        : `Executamos ${formatCurrency(cards.comissao)} no recorte atual.`,
    why:
      cards.necessarioPorDia > 0
        ? `O ritmo atual está em ${formatCurrency(cards.paceComissao)}/dia contra ${formatCurrency(cards.necessarioPorDia)}/dia necessários.`
        : "Sem meta cadastrada, então o painel mede apenas o ritmo absoluto da operação.",
    action:
      cards.necessarioPorDia > 0 && cards.paceComissao < cards.necessarioPorDia
        ? "Ataque primeiro os drivers com maior gap de comissão para recuperar o pace diário."
        : "Mantenha a cadência atual e use os drivers para defender margem e mix.",
  });

  if (lowRentabilityProduct) {
    items.push({
      id: "mix-rentability",
      severity:
        lowRentabilityProduct.takeRate < cards.takeRate * 0.75
          ? "critical"
          : "warning",
      headline: "Mix pressionando rentabilidade",
      whatChanged: `O take rate do recorte está em ${formatPercent(cards.takeRate)}.`,
      why: `${lowRentabilityProduct.produto} carrega ${formatCurrency(
        lowRentabilityProduct.liquido
      )} de líquido com take rate de ${formatPercent(
        lowRentabilityProduct.takeRate
      )}, abaixo da média executiva.`,
      action:
        "Abra o mix do produto e revise operação, pricing e origem para defender margem.",
      filters: { produto: [lowRentabilityProduct.produto] },
    });
  }

  items.push({
    id: "quality-sem-comissao",
    severity:
      quality.pctSemComissao > 0.06 || quality.pctLiquidoFallback > 0.06
        ? "critical"
        : quality.pctSemComissao > 0.03 || quality.pctComissaoCalculada > 0.08
          ? "warning"
          : "info",
    headline: "Qualidade de execução e receita pendente",
    whatChanged: `${formatPercent(quality.pctSemComissao)} dos contratos estão sem comissão e o score de qualidade está em ${dataQuality.score}/100.`,
    why:
      worstStage && worstStage.semComissaoCount > 0
        ? `${worstStage.etapa} concentra ${worstStage.semComissaoCount} contratos sem comissão no recorte.`
        : `Fallback de líquido em ${formatPercent(quality.pctLiquidoFallback)} e comissão calculada em ${formatPercent(quality.pctComissaoCalculada)} dos registros.`,
    action:
      worstStage && worstStage.semComissaoCount > 0
        ? "Filtre a etapa crítica e saneie os casos para destravar receita e confiança do painel."
        : "Revise as exceções de qualidade para evitar ruído nas decisões executivas.",
    filters:
      worstStage && worstStage.semComissaoCount > 0
        ? { etapaPipeline: [worstStage.etapa] }
        : undefined,
  });

  if (topSeller) {
    items.push({
      id: "concentration",
      severity:
        topSellerShare > 0.5
          ? "critical"
          : topSellerShare > 0.3
            ? "warning"
            : "info",
      headline:
        topSellerShare > 0.5
          ? "Dependência alta da líder"
          : "Concentração comercial na líder",
      whatChanged: `${topSeller.vendedor} concentra ${formatPercent(
        topSellerShare
      )} da comissão total do recorte.`,
      why: `${topSeller.vendedor} responde por ${formatPercent(
        topSeller.pctTotal ?? 0
      )} da comissão total com ${formatPercent(
        topSeller.pctMeta ?? 0
      )} da meta individual. Em um time enxuto, isso aumenta a dependência de uma única vendedora.`,
      action:
        topSellerShare > 0.5
          ? "Abra a visão por vendedora e redistribua pipeline para reduzir dependência da líder."
          : "Use a rotina da líder como benchmark e replique o padrão nas demais vendedoras.",
      filters: { vendedorNome: [topSeller.vendedor] },
    });
  }

  return items.slice(0, 4);
}

function buildWatchlist(
  input: BuildExecutiveLayerInput,
  dataQuality: DataQualityInfo
): WatchlistItem[] {
  const { cards, bySeller, byProduct, quality, alerts } = input;
  const items: WatchlistItem[] = [];
  const topSeller = bySeller
    .slice()
    .sort((a, b) => b.comissao - a.comissao)[0];
  const topSellerShare = getTopSellerShare(bySeller, cards.comissao);
  const worstSeller = bySeller
    .slice()
    .sort((a, b) => b.semComissaoCount - a.semComissaoCount)[0];
  const lowMarginProduct = byProduct
    .filter(product => product.liquido > 0)
    .slice()
    .sort((a, b) => b.liquido - a.liquido)
    .find(product => product.takeRate < cards.takeRate * 0.85);

  if (
    cards.necessarioPorDia > 0 &&
    cards.paceComissao < cards.necessarioPorDia
  ) {
    items.push({
      id: "pace-behind",
      severity:
        cards.paceComissao < cards.necessarioPorDia * 0.85
          ? "critical"
          : "warning",
      title: "Pace abaixo do necessário",
      impactLabel: `Gap diário de ${formatCurrency(
        Math.max(0, cards.necessarioPorDia - cards.paceComissao)
      )}.`,
      probableCause:
        "O volume atual não sustenta a meta do período sem ganho adicional de comissão por dia.",
      cta: "Investigar drivers com maior gap absoluto de comissão.",
    });
  }

  if (quality.pctSemComissao > 0.05) {
    items.push({
      id: "sem-comissao",
      severity: quality.pctSemComissao > 0.08 ? "critical" : "warning",
      title: "Receita pendente em contratos sem comissão",
      impactLabel: `${formatPercent(quality.pctSemComissao)} do recorte sem monetização.`,
      probableCause:
        worstSeller && worstSeller.semComissaoCount > 0
          ? `${worstSeller.vendedor} lidera o volume de contratos sem comissão.`
          : "Há atraso de monetização relevante no recorte atual.",
      cta: "Abrir exceções e priorizar saneamento da fila sem comissão.",
      filters:
        worstSeller && worstSeller.semComissaoCount > 0
          ? { vendedorNome: [worstSeller.vendedor] }
          : undefined,
    });
  }

  if (topSeller && topSellerShare > 0.5) {
    items.push({
      id: "concentration-top-seller",
      severity: topSellerShare > 0.65 ? "critical" : "warning",
      title: "Concentração elevada em uma vendedora",
      impactLabel: `${formatPercent(topSellerShare)} da comissão depende de ${topSeller.vendedor}.`,
      probableCause:
        "A distribuição do resultado está pouco espalhada para o tamanho do time, aumentando o risco operacional de perda de ritmo.",
      cta: "Revisar a operação da líder e redistribuir alavancas para o restante do time.",
      filters: { vendedorNome: [topSeller.vendedor] },
    });
  }

  if (lowMarginProduct) {
    items.push({
      id: "low-margin-product",
      severity:
        lowMarginProduct.takeRate < cards.takeRate * 0.75
          ? "critical"
          : "warning",
      title: "Produto com volume alto e rentabilidade baixa",
      impactLabel: `${lowMarginProduct.produto} tem ${formatCurrency(
        lowMarginProduct.liquido
      )} de líquido com take rate de ${formatPercent(
        lowMarginProduct.takeRate
      )}.`,
      probableCause:
        "O mix do recorte está deslocando volume para uma operação menos rentável do que a média executiva.",
      cta: "Abrir o mix por produto e revisar origem, pricing e tipo de operação.",
      filters: { produto: [lowMarginProduct.produto] },
    });
  }

  if (quality.pctLiquidoFallback > 0.05 || quality.pctComissaoCalculada > 0.1) {
    items.push({
      id: "data-quality",
      severity: dataQuality.status === "critical" ? "critical" : "warning",
      title: "Qualidade de dados impactando a leitura",
      impactLabel: `${dataQuality.score}/100 de score de confiabilidade.`,
      probableCause:
        "Fallback de líquido ou comissão calculada acima do ideal reduzem a confiança da leitura executiva.",
      cta: "Abrir a área de auditoria e priorizar saneamento das flags críticas.",
    });
  }

  alerts.slice(0, 2).forEach(alert => {
    items.push({
      id: `alert-${alert.type}`,
      severity: alert.severity,
      title: alert.title,
      impactLabel: alert.detail,
      probableCause:
        "Sinal detectado pelo monitoramento determinístico da camada de gestão.",
      cta: "Aplicar recorte e investigar a origem do desvio.",
      filters: alert.filters,
    });
  });

  const severityRank = { critical: 0, warning: 1, info: 2 } as const;
  return items
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .slice(0, 5);
}

export function buildExecutiveLayer(
  input: BuildExecutiveLayerInput
): ExecutiveLayer {
  const dataQuality = buildDataQualityInfo(input.quality);
  const executiveMetrics = buildMetrics(input);
  const businessStatus = buildBusinessStatus(
    executiveMetrics,
    dataQuality,
    input.cards
  );

  return {
    executiveMetrics,
    executiveNarrative: buildNarrative(input, dataQuality),
    watchlist: buildWatchlist(input, dataQuality),
    freshness: buildFreshness(input.latestSyncAt),
    dataQuality,
    businessStatus,
  };
}
