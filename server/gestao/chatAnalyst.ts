import { z } from "zod";
import { invokeLLM, type Message } from "../_core/llm";
import type { GestaoResumoSnapshot } from "./resumoSnapshot";

const CHAT_ROLE_SCHEMA = z.enum(["user", "assistant", "system"]);
const FILTER_KEY_SCHEMA = z.enum([
  "etapaPipeline",
  "vendedorNome",
  "produto",
  "tipoOperacao",
]);
const COMPARISON_PRESET_SCHEMA = z.enum([
  "prev_month",
  "prev_week",
  "prev_year",
]);
const GRANULARITY_SCHEMA = z.enum(["day", "week", "month"]);

const VIEW_STATE_SCHEMA = z.object({
  dateFrom: z.string().min(10),
  dateTo: z.string().min(10),
  comparisonMode: z.boolean(),
  comparisonDateFrom: z.string(),
  comparisonDateTo: z.string(),
  filterState: z.object({
    etapaPipeline: z.array(z.string()),
    vendedorNome: z.array(z.string()),
    produto: z.array(z.string()),
    tipoOperacao: z.array(z.string()),
  }),
  flagFilters: z.object({
    comissaoCalculada: z.boolean(),
    liquidoFallback: z.boolean(),
    inconsistenciaData: z.boolean(),
    semComissao: z.boolean(),
  }),
  sortBy: z.enum(["data", "comissao", "liquido", "takeRate"]),
  sortDir: z.enum(["asc", "desc"]),
  incluirSemComissao: z.boolean(),
  granularity: GRANULARITY_SCHEMA,
  seriesVisibility: z.object({
    comissao: z.boolean(),
    liquido: z.boolean(),
    liquidoSem: z.boolean(),
  }),
  activeViewId: z.string().nullable().optional(),
});

const AVAILABLE_VIEW_SCHEMA = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["preset", "custom"]),
});

const RAW_ACTION_SCHEMA = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("apply_filter"),
    label: z.string().optional().default("Aplicar filtro"),
    key: FILTER_KEY_SCHEMA,
    values: z.array(z.string()).min(1).max(10),
  }),
  z.object({
    type: z.literal("clear_filter"),
    label: z.string().optional().default("Limpar filtro"),
    key: FILTER_KEY_SCHEMA,
  }),
  z.object({
    type: z.literal("set_comparison_preset"),
    label: z.string().optional().default("Comparar período"),
    preset: COMPARISON_PRESET_SCHEMA,
  }),
  z.object({
    type: z.literal("set_granularity"),
    label: z.string().optional().default("Trocar granularidade"),
    granularity: GRANULARITY_SCHEMA,
  }),
  z.object({
    type: z.literal("toggle_sem_comissao"),
    label: z.string().optional().default("Ajustar contratos sem comissão"),
    value: z.boolean(),
  }),
  z.object({
    type: z.literal("apply_saved_view"),
    label: z.string().optional().default("Abrir vista salva"),
    viewId: z.string(),
  }),
]);

const RAW_RESPONSE_SCHEMA = z.object({
  answer: z.string().min(1),
  summary: z.string().max(100).optional().default(""),
  evidence: z.array(z.string()).max(5).default([]),
  riskLevel: z.enum(["low", "medium", "high"]).default("medium"),
  recommendedActions: z.array(RAW_ACTION_SCHEMA).max(4).default([]),
  followUpPrompts: z.array(z.string()).max(6).default([]),
  contextLabel: z.string().optional().default(""),
});

export const CHAT_ANALYST_INPUT_SCHEMA = z.object({
  question: z.string().min(2).max(600),
  messages: z
    .array(
      z.object({
        role: CHAT_ROLE_SCHEMA,
        content: z.string().min(1).max(2000),
      })
    )
    .max(16)
    .default([]),
  viewState: VIEW_STATE_SCHEMA,
  availableViews: z.array(AVAILABLE_VIEW_SCHEMA).max(20).default([]),
});

export type GestaoAnalystInput = z.infer<typeof CHAT_ANALYST_INPUT_SCHEMA>;
export type GestaoAnalystAction = z.infer<typeof RAW_ACTION_SCHEMA>;
export type GestaoAnalystResponse = z.infer<typeof RAW_RESPONSE_SCHEMA>;

type LooseGestaoAnalystResponse = {
  answer?: unknown;
  summary?: unknown;
  evidence?: unknown;
  riskLevel?: unknown;
  recommendedActions?: unknown;
  followUpPrompts?: unknown;
  contextLabel?: unknown;
};

type GenerateGestaoAnalystResponseArgs = {
  input: GestaoAnalystInput;
  snapshot: GestaoResumoSnapshot;
  comparisonSnapshot?: GestaoResumoSnapshot | null;
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

function summarizeSelection(label: string, values: string[]) {
  if (values.length === 0) return `${label}: todos`;
  if (values.length <= 2) return `${label}: ${values.join(", ")}`;
  return `${label}: ${values.slice(0, 2).join(", ")} +${values.length - 2}`;
}

function buildContextLabel(input: GestaoAnalystInput["viewState"]) {
  const parts = [
    `Período ${input.dateFrom} a ${input.dateTo}`,
    summarizeSelection("Etapas", input.filterState.etapaPipeline),
    summarizeSelection("Vendedoras", input.filterState.vendedorNome),
    summarizeSelection("Produtos", input.filterState.produto),
    summarizeSelection("Operações", input.filterState.tipoOperacao),
    input.incluirSemComissao
      ? "Inclui contratos sem comissão"
      : "Oculta contratos sem comissão",
    `Granularidade ${input.granularity}`,
  ];

  if (
    input.comparisonMode &&
    input.comparisonDateFrom &&
    input.comparisonDateTo
  ) {
    parts.push(
      `Comparação ${input.comparisonDateFrom} a ${input.comparisonDateTo}`
    );
  }

  return parts.join(" • ");
}

function buildComparisonSummary(
  current: GestaoResumoSnapshot,
  comparison?: GestaoResumoSnapshot | null
) {
  if (!comparison) return null;

  const currentCommission = current.cards.comissao;
  const previousCommission = comparison.cards.comissao;
  const currentTakeRate = current.cards.takeRate;
  const previousTakeRate = comparison.cards.takeRate;
  const currentContracts = current.cards.contratos;
  const previousContracts = comparison.cards.contratos;

  const deltaPct = (currentValue: number, previousValue: number) =>
    previousValue === 0
      ? currentValue === 0
        ? 0
        : 1
      : (currentValue - previousValue) / previousValue;

  return {
    comissaoAtual: formatCurrency(currentCommission),
    comissaoComparada: formatCurrency(previousCommission),
    deltaComissao: formatPercent(deltaPct(currentCommission, previousCommission)),
    takeRateAtual: formatPercent(currentTakeRate),
    takeRateComparado: formatPercent(previousTakeRate),
    deltaTakeRate: formatPercent(deltaPct(currentTakeRate, previousTakeRate)),
    contratosAtuais: currentContracts,
    contratosComparados: previousContracts,
    deltaContratos: formatPercent(deltaPct(currentContracts, previousContracts)),
  };
}

function buildAnalystSignals(
  snapshot: GestaoResumoSnapshot,
  comparisonSnapshot?: GestaoResumoSnapshot | null
) {
  const { cards, bySeller, byProduct, dataQuality } = snapshot;

  // --- Pace vs Meta ---
  const metaExists = cards.metaComissao > 0;
  const paceExpected =
    metaExists && cards.totalDias > 0
      ? (cards.metaComissao * cards.diasDecorridos) / cards.totalDias
      : null;
  const paceRatio =
    paceExpected && paceExpected > 0
      ? cards.paceComissao / paceExpected
      : null;
  const paceStatus =
    paceRatio === null
      ? "sem_meta"
      : paceRatio >= 0.9
        ? "on_track"
        : paceRatio >= 0.7
          ? "behind"
          : "critical";
  const paceGap =
    metaExists && paceExpected !== null
      ? cards.paceComissao - paceExpected
      : null;

  // --- Seller concentration ---
  const totalComissao = cards.comissao;
  const topSeller = bySeller
    .slice()
    .sort((a, b) => b.comissao - a.comissao)[0] ?? null;
  const topSellerComissao = topSeller?.comissao ?? 0;
  const topSellerPct =
    totalComissao > 0 ? topSellerComissao / totalComissao : 0;
  const concentrationRisk =
    topSellerPct > 0.5 ? "high" : topSellerPct > 0.3 ? "medium" : "low";

  // --- Sellers at risk (below 50% of their individual goal) ---
  const sellersAtRisk = bySeller
    .filter(s => s.pctMeta !== undefined && s.pctMeta < 0.5)
    .map(s => ({
      vendedor: s.vendedor,
      pctMeta: formatPercent(s.pctMeta ?? 0),
      comissao: formatCurrency(s.comissao),
    }));

  // --- Top product concentration ---
  const topProduct = byProduct
    .slice()
    .sort((a, b) => b.comissao - a.comissao)[0] ?? null;
  const topProductPct =
    totalComissao > 0 && topProduct
      ? topProduct.comissao / totalComissao
      : 0;

  // --- Data quality signals ---
  const qualityAlerts: string[] = [];
  if (dataQuality.pctSemComissao > 0.2)
    qualityAlerts.push(
      `${formatPercent(dataQuality.pctSemComissao)} dos contratos sem comissão (takeRate subavaliado)`
    );
  if (dataQuality.pctLiquidoFallback > 0.1)
    qualityAlerts.push(
      `${formatPercent(dataQuality.pctLiquidoFallback)} usando valor líquido estimado (fallback)`
    );
  if (dataQuality.totalRegistros < 5)
    qualityAlerts.push("Amostra muito pequena — conclusões com baixa confiança");

  // --- Comparison delta ---
  const comparisonDelta =
    comparisonSnapshot && comparisonSnapshot.cards.comissao > 0
      ? (cards.comissao - comparisonSnapshot.cards.comissao) /
        comparisonSnapshot.cards.comissao
      : null;

  return {
    paceStatus,
    paceRatioFormatted: paceRatio !== null ? formatPercent(paceRatio) : null,
    paceGapFormatted: paceGap !== null ? formatCurrency(Math.abs(paceGap)) : null,
    paceGapDirection:
      paceGap === null ? null : paceGap >= 0 ? "acima" : "abaixo",
    metaExists,
    sellerConcentration: {
      topSeller: topSeller?.vendedor ?? null,
      topSellerPct: formatPercent(topSellerPct),
      concentrationRisk,
    },
    topProductConcentration: {
      topProduct: topProduct?.produto ?? null,
      topProductPct: formatPercent(topProductPct),
    },
    sellersAtRisk,
    sellersAtRiskCount: sellersAtRisk.length,
    qualityAlerts,
    hasQualityAlerts: qualityAlerts.length > 0,
    comparisonDeltaFormatted:
      comparisonDelta !== null ? formatPercent(comparisonDelta) : null,
    comparisonDeltaDirection:
      comparisonDelta === null
        ? null
        : comparisonDelta >= 0
          ? "crescimento"
          : "queda",
  };
}

export function buildGestaoAnalystGrounding({
  input,
  snapshot,
  comparisonSnapshot,
}: GenerateGestaoAnalystResponseArgs) {
  return {
    contextLabel: buildContextLabel(input.viewState),
    context: {
      periodo: {
        dateFrom: input.viewState.dateFrom,
        dateTo: input.viewState.dateTo,
      },
      comparacao: input.viewState.comparisonMode
        ? {
            enabled: true,
            dateFrom: input.viewState.comparisonDateFrom,
            dateTo: input.viewState.comparisonDateTo,
          }
        : { enabled: false },
      filtros: input.viewState.filterState,
      flags: input.viewState.flagFilters,
      incluirSemComissao: input.viewState.incluirSemComissao,
      granularidade: input.viewState.granularity,
      activeViewId: input.viewState.activeViewId || null,
    },
    businessStatus: snapshot.businessStatus,
    freshness: snapshot.freshness,
    dataQuality: snapshot.dataQuality,
    executiveMetrics: snapshot.executiveMetrics.map(metric => ({
      id: metric.id,
      label: metric.label,
      value: metric.formattedValue,
      status: metric.status,
      trend: metric.trend,
      deltaVsTarget:
        metric.deltaVsTarget !== undefined
          ? formatPercent(metric.deltaVsTarget)
          : null,
      helpText: metric.helpText,
      microText: metric.microText,
    })),
    executiveNarrative: snapshot.executiveNarrative.slice(0, 4),
    watchlist: snapshot.watchlist.slice(0, 4),
    cards: {
      ...snapshot.cards,
      liquidoFormatted: formatCurrency(snapshot.cards.liquido),
      comissaoFormatted: formatCurrency(snapshot.cards.comissao),
      takeRateFormatted: formatPercent(snapshot.cards.takeRate),
      takeRateLimpoFormatted: formatPercent(snapshot.cards.takeRateLimpo),
      paceFormatted: formatCurrency(snapshot.cards.paceComissao),
      necessarioPorDiaFormatted: formatCurrency(snapshot.cards.necessarioPorDia),
    },
    topSellers: snapshot.bySeller
      .slice()
      .sort((a, b) => b.comissao - a.comissao)
      .slice(0, 5)
      .map(row => ({
        vendedor: row.vendedor,
        comissao: formatCurrency(row.comissao),
        contratos: row.count,
        pctMeta: formatPercent(row.pctMeta || 0),
        pctTotal: formatPercent(row.pctTotal || 0),
        takeRate: formatPercent(row.takeRate),
      })),
    topProducts: snapshot.byProduct
      .slice()
      .sort((a, b) => b.comissao - a.comissao)
      .slice(0, 5)
      .map(row => ({
        produto: row.produto,
        comissao: formatCurrency(row.comissao),
        contratos: row.count,
        takeRate: formatPercent(row.takeRate),
      })),
    pipeline: snapshot.byStage
      .slice()
      .sort((a, b) => b.comissao - a.comissao)
      .slice(0, 5)
      .map(row => ({
        etapa: row.etapa,
        contratos: row.count,
        comissao: formatCurrency(row.comissao),
        takeRate: formatPercent(row.takeRate),
      })),
    operationMix: snapshot.byOperationType
      .slice()
      .sort((a, b) => b.comissao - a.comissao)
      .slice(0, 5)
      .map(row => ({
        tipoOperacao: row.tipoOperacao,
        contratos: row.count,
        comissao: formatCurrency(row.comissao),
        takeRate: formatPercent(row.takeRate),
      })),
    analystSignals: buildAnalystSignals(snapshot, comparisonSnapshot),
    comparisonSummary: buildComparisonSummary(snapshot, comparisonSnapshot),
    availableActions: {
      filters: {
        etapaPipeline: snapshot.byStage.map(row => row.etapa).slice(0, 12),
        vendedorNome: snapshot.bySeller.map(row => row.vendedor).slice(0, 12),
        produto: snapshot.byProduct.map(row => row.produto).slice(0, 12),
        tipoOperacao: snapshot.byOperationType
          .map(row => row.tipoOperacao)
          .slice(0, 12),
      },
      comparisonPresets: COMPARISON_PRESET_SCHEMA.options,
      granularities: GRANULARITY_SCHEMA.options,
      savedViews: input.availableViews,
    },
  };
}

function getAllowedFilterValues(snapshot: GestaoResumoSnapshot) {
  return {
    etapaPipeline: new Set(snapshot.byStage.map(row => row.etapa)),
    vendedorNome: new Set(snapshot.bySeller.map(row => row.vendedor)),
    produto: new Set(snapshot.byProduct.map(row => row.produto)),
    tipoOperacao: new Set(snapshot.byOperationType.map(row => row.tipoOperacao)),
  };
}

function ensureActionLabel(
  action: GestaoAnalystAction,
  availableViews: Map<string, string>
) {
  if (action.label.trim().length > 0) return action.label.trim();

  if (action.type === "apply_filter") {
    return `Filtrar ${action.key}`;
  }
  if (action.type === "clear_filter") {
    return `Limpar ${action.key}`;
  }
  if (action.type === "set_comparison_preset") {
    return "Comparar período";
  }
  if (action.type === "set_granularity") {
    return `Ver por ${action.granularity}`;
  }
  if (action.type === "toggle_sem_comissao") {
    return action.value ? "Incluir sem comissão" : "Ocultar sem comissão";
  }

  return availableViews.get(action.viewId) || "Abrir vista salva";
}

export function sanitizeGestaoAnalystResponse(
  response: GestaoAnalystResponse,
  snapshot: GestaoResumoSnapshot,
  availableViews: GestaoAnalystInput["availableViews"]
) {
  const allowedFilterValues = getAllowedFilterValues(snapshot);
  const availableViewsMap = new Map(
    availableViews.map(view => [view.id, view.name] as const)
  );

  const recommendedActions = response.recommendedActions
    .map(action => {
      if (action.type === "apply_filter") {
        const allowedValues = allowedFilterValues[action.key];
        const values = action.values.filter(value => allowedValues.has(value));
        if (values.length === 0) return null;
        return {
          ...action,
          label: ensureActionLabel({ ...action, values }, availableViewsMap),
          values,
        } satisfies GestaoAnalystAction;
      }

      if (action.type === "clear_filter") {
        return {
          ...action,
          label: ensureActionLabel(action, availableViewsMap),
        } satisfies GestaoAnalystAction;
      }

      if (action.type === "set_comparison_preset") {
        return {
          ...action,
          label: ensureActionLabel(action, availableViewsMap),
        } satisfies GestaoAnalystAction;
      }

      if (action.type === "set_granularity") {
        return {
          ...action,
          label: ensureActionLabel(action, availableViewsMap),
        } satisfies GestaoAnalystAction;
      }

      if (action.type === "toggle_sem_comissao") {
        return {
          ...action,
          label: ensureActionLabel(action, availableViewsMap),
        } satisfies GestaoAnalystAction;
      }

      if (!availableViewsMap.has(action.viewId)) {
        return null;
      }

      return {
        ...action,
        label: ensureActionLabel(action, availableViewsMap),
      } satisfies GestaoAnalystAction;
    })
    .filter(Boolean) as GestaoAnalystAction[];

  const followUpPrompts = response.followUpPrompts
    .map(prompt => prompt.trim())
    .filter(Boolean)
    .slice(0, 3);

  return {
    answer: response.answer.trim(),
    summary: (response.summary ?? "").trim(),
    evidence: response.evidence
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 5),
    riskLevel: response.riskLevel,
    recommendedActions,
    followUpPrompts,
    contextLabel: response.contextLabel.trim(),
  } satisfies GestaoAnalystResponse;
}

function extractContentText(content: Message["content"]) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === "string") return part;
        return part.type === "text" ? part.text : "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof content === "string") return content;
  if (content.type === "text") return content.text;
  return "";
}

function unwrapJsonCodeFence(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function extractJsonObjectCandidate(content: string) {
  const unfenced = unwrapJsonCodeFence(content);
  const firstBrace = unfenced.indexOf("{");
  const lastBrace = unfenced.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return unfenced.slice(firstBrace, lastBrace + 1);
  }

  return unfenced;
}

function toCleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }

  return [];
}

function normalizeRiskLevel(
  value: unknown,
  snapshot: GestaoResumoSnapshot
): "low" | "medium" | "high" {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "low" || normalized === "baixo") return "low";
    if (
      normalized === "medium" ||
      normalized === "medio" ||
      normalized === "médio" ||
      normalized === "moderado"
    ) {
      return "medium";
    }
    if (
      normalized === "high" ||
      normalized === "alto" ||
      normalized === "critical" ||
      normalized === "critico" ||
      normalized === "crítico"
    ) {
      return "high";
    }
  }

  if (snapshot.businessStatus.status === "critical") return "high";
  if (snapshot.businessStatus.status === "warning") return "medium";
  return "low";
}

function normalizeActionType(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "apply_filter" ||
    normalized === "apply-filter" ||
    normalized === "applyfilter"
  ) {
    return "apply_filter" as const;
  }
  if (
    normalized === "clear_filter" ||
    normalized === "clear-filter" ||
    normalized === "clearfilter"
  ) {
    return "clear_filter" as const;
  }
  if (
    normalized === "set_comparison_preset" ||
    normalized === "set-comparison-preset" ||
    normalized === "setcomparisonpreset"
  ) {
    return "set_comparison_preset" as const;
  }
  if (
    normalized === "set_granularity" ||
    normalized === "set-granularity" ||
    normalized === "setgranularity"
  ) {
    return "set_granularity" as const;
  }
  if (
    normalized === "toggle_sem_comissao" ||
    normalized === "toggle-sem-comissao" ||
    normalized === "togglesemcomissao"
  ) {
    return "toggle_sem_comissao" as const;
  }
  if (
    normalized === "apply_saved_view" ||
    normalized === "apply-saved-view" ||
    normalized === "applysavedview"
  ) {
    return "apply_saved_view" as const;
  }
  return null;
}

function normalizeLooseActions(value: unknown): GestaoAnalystAction[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(item => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const type = normalizeActionType(record.type);
      const label = toCleanString(record.label);

      if (type === "apply_filter") {
        const key = record.key;
        const values = Array.isArray(record.values)
          ? record.values.filter(v => typeof v === "string")
          : typeof record.value === "string"
            ? [record.value]
            : [];
        if (
          key === "etapaPipeline" ||
          key === "vendedorNome" ||
          key === "produto" ||
          key === "tipoOperacao"
        ) {
          return { type, label, key, values };
        }
        return null;
      }

      if (type === "clear_filter") {
        const key = record.key;
        if (
          key === "etapaPipeline" ||
          key === "vendedorNome" ||
          key === "produto" ||
          key === "tipoOperacao"
        ) {
          return { type, label, key };
        }
        return null;
      }

      if (type === "set_comparison_preset") {
        const preset = record.preset;
        if (
          preset === "prev_month" ||
          preset === "prev_week" ||
          preset === "prev_year"
        ) {
          return { type, label, preset };
        }
        return null;
      }

      if (type === "set_granularity") {
        const granularity = record.granularity;
        if (
          granularity === "day" ||
          granularity === "week" ||
          granularity === "month"
        ) {
          return { type, label, granularity };
        }
        return null;
      }

      if (type === "toggle_sem_comissao") {
        return { type, label, value: Boolean(record.value) };
      }

      const viewId = toCleanString(record.viewId);
      return viewId ? { type, label, viewId } : null;
    })
    .filter(Boolean) as GestaoAnalystAction[];
}

function buildFallbackAnalystResponse(
  rawContent: string,
  groundingContextLabel: string,
  snapshot: GestaoResumoSnapshot
): GestaoAnalystResponse {
  const cleaned = unwrapJsonCodeFence(rawContent).trim();
  return {
    answer:
      cleaned.length > 0
        ? cleaned
        : `Analisei o recorte ${groundingContextLabel}, mas o modelo respondeu fora do formato esperado nesta tentativa.`,
    summary: snapshot.businessStatus.headline,
    evidence: [
      `Comissão atual: ${formatCurrency(snapshot.cards.comissao)}`,
      `Contratos no recorte: ${snapshot.cards.contratos}`,
      `Take rate: ${formatPercent(snapshot.cards.takeRate)}`,
    ],
    riskLevel: normalizeRiskLevel(undefined, snapshot),
    recommendedActions: [],
    followUpPrompts: [],
    contextLabel: groundingContextLabel,
  };
}

function normalizeLooseResponse(
  value: unknown,
  snapshot: GestaoResumoSnapshot,
  groundingContextLabel: string
): GestaoAnalystResponse | null {
  if (!value || typeof value !== "object") return null;
  const loose = value as LooseGestaoAnalystResponse;
  const answer = toCleanString(loose.answer);
  if (!answer) return null;

  return {
    answer,
    summary: toCleanString(loose.summary),
    evidence: toStringArray(loose.evidence).slice(0, 5),
    riskLevel: normalizeRiskLevel(loose.riskLevel, snapshot),
    recommendedActions: normalizeLooseActions(loose.recommendedActions),
    followUpPrompts: toStringArray(loose.followUpPrompts).slice(0, 3),
    contextLabel: toCleanString(loose.contextLabel) || groundingContextLabel,
  };
}

function buildSystemPrompt() {
  return `# Identidade e Missão
Você é um analista de BI executivo sênior especializado em performance comercial de correspondentes bancários. Responde exclusivamente em PT-BR. Sua função é transformar dados brutos de produção em diagnósticos acionáveis para o gestor da carteira.

# Fronteira de Conhecimento
- Você SOMENTE analisa dados presentes no GROUNDING ESTRUTURADO fornecido no contexto da conversa.
- Jamais invente números, datas ou nomes. Se um dado não está no grounding, diga "não disponível no recorte atual".
- Nunca cite dados de períodos fora do recorte do grounding.

# Metodologia de Análise (siga nesta ordem)
1. ORIENT — Identifique o contexto: período, filtros ativos, granularidade, se há comparação ativa.
2. DIAGNOSE — Examine os sinais pré-computados (analyst_signals), businessStatus, watchlist e métricas executivas. Priorize anomalias e desvios de meta antes de tendências positivas.
3. EXPLAIN — Explique a causa mais provável do padrão observado usando evidências do grounding. Conecte o que (número) ao porquê (concentração, sazonalidade, qualidade de dados, mix de produto).
4. RECOMMEND — Sugira as ações de navegação que melhor iluminariam o diagnóstico. Prefira ações que segmentam ou comparam sobre ações que apenas limpam filtros.

# Critérios de Qualidade da Evidência
- evidence: cite valores formatados do grounding (ex: "Comissão R$ 12.450 = 87% da meta"). Máximo 5 itens. Cada item deve ser uma frase concisa com dado + contexto.
- Não repita no evidence o que já está no answer.
- Se dataQuality indica problemas (pctSemComissao alto, pctLiquidoFallback > 10%), inclua isso como evidência de risco.

# Avaliação de Risco
- riskLevel "high": pace crítico (< 70% do esperado), concentração > 50% num único vendedor ou produto, ou pctSemComissao > 30%.
- riskLevel "medium": pace entre 70–90%, concentração 30–50%, ou alertas ativos de qualidade de dados.
- riskLevel "low": pace > 90% da meta proporcional, sem alertas críticos, distribuição saudável.

# Regras de Ações Recomendadas
- apply_filter: use para segmentar a análise (ex: isolar vendedor específico, produto, etapa). O label deve descrever o insight, não o filtro (ex: "Ver contratos de João Silva" não "Filtrar vendedorNome").
- clear_filter: use apenas quando o filtro ativo está obscurecendo a visão geral.
- set_comparison_preset: use quando detectar tendência ou quando o gestor pergunta sobre evolução. Sempre explique qual período será comparado.
- set_granularity: mude para "day" se investigando anomalia pontual, "week" para tendências, "month" para visão estratégica.
- toggle_sem_comissao: use quando pctSemComissao > 15% e isso afeta o takeRate observado.
- apply_saved_view: use apenas se a vista salva for semanticamente relevante para a pergunta.
- NUNCA recomende exportação, sync, alteração de metas ou modificação de dados.
- Máximo 4 ações. Prefira qualidade à quantidade.

# Perguntas de Follow-up
- followUpPrompts: 3 perguntas que aprofundam o diagnóstico atual ou abrem investigações paralelas relevantes.
- Formule como o gestor perguntaria, não como analista (ex: "Quem está puxando o crescimento?" não "Analisar distribuição por vendedor?").

# Formato de Resposta (JSON estrito)
{
  "answer": "Resposta executiva principal. 2–4 parágrafos curtos. Tom direto e objetivo. Sem listas no answer — use frases. Comece pelo diagnóstico mais importante.",
  "summary": "1 frase resumindo o status do período em até 12 palavras. Ex: 'Meta 87% — pace saudável, concentração em 2 vendedoras.'",
  "evidence": ["Dado 1 com contexto", "Dado 2 com contexto"],
  "riskLevel": "low | medium | high",
  "recommendedActions": [{ "type": "...", "label": "Label descritivo do insight", ... }],
  "followUpPrompts": ["Pergunta 1?", "Pergunta 2?", "Pergunta 3?"],
  "contextLabel": "Descrição curta do recorte analisado"
}`;
}

function buildConversationHistory(messages: GestaoAnalystInput["messages"]) {
  return messages.slice(-8).map<Message>(message => ({
    role: message.role,
    content: message.content,
  }));
}

function buildNoDataResponse(
  input: GestaoAnalystInput,
  snapshot: GestaoResumoSnapshot
) {
  const contextLabel = buildContextLabel(input.viewState);
  return {
    answer:
      `No recorte ${contextLabel} ainda não há contratos materializados para análise.` +
      " A primeira ação é ampliar o período, remover filtros restritivos ou rodar uma sincronização pelo fluxo normal da Gestão.",
    summary: "Sem dados no recorte — ampliar período ou remover filtros.",
    evidence: [
      `Contratos no recorte: ${snapshot.cards.contratos}`,
      `Comissão no recorte: ${formatCurrency(snapshot.cards.comissao)}`,
    ],
    riskLevel: "medium",
    recommendedActions: [],
    followUpPrompts: [
      "Quais filtros estão restringindo mais este recorte?",
      "Vale comparar com o mês anterior?",
      "Qual vista salva faz mais sentido para investigar?",
    ],
    contextLabel,
  } satisfies GestaoAnalystResponse;
}

export async function generateGestaoAnalystResponse({
  input,
  snapshot,
  comparisonSnapshot,
}: GenerateGestaoAnalystResponseArgs): Promise<GestaoAnalystResponse> {
  if (snapshot.cards.contratos === 0) {
    return buildNoDataResponse(input, snapshot);
  }

  const grounding = buildGestaoAnalystGrounding({
    input,
    snapshot,
    comparisonSnapshot,
  });

  const llmResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(),
      },
      // Grounding anchored as a stable seed turn — keeps conversation history clean
      {
        role: "user",
        content:
          "## GROUNDING ESTRUTURADO DO RECORTE ATUAL\n\n" +
          "Este é o contexto de dados para toda a conversa. Baseie suas respostas exclusivamente neste grounding. Responda sempre em JSON.\n\n" +
          JSON.stringify(grounding, null, 2),
      },
      {
        role: "assistant",
        content:
          `Grounding recebido. Recorte: ${grounding.contextLabel}. ` +
          `Status: ${grounding.businessStatus?.status ?? "desconhecido"}. ` +
          `Sinais principais: pace ${grounding.analystSignals.paceStatus}, ` +
          `concentração de vendedor ${grounding.analystSignals.sellerConcentration.concentrationRisk}` +
          (grounding.analystSignals.hasQualityAlerts
            ? `, alertas de qualidade ativos`
            : "") +
          `. Pronto para analisar.`,
      },
      ...buildConversationHistory(input.messages),
      {
        role: "user",
        content: input.question,
      },
    ],
    responseFormat: { type: "json_object" },
    maxTokens: 2000,
  });

  const rawContent = extractContentText(
    llmResponse.choices[0]?.message.content ?? ""
  );

  let parsed: z.infer<typeof RAW_RESPONSE_SCHEMA>;
  try {
    const parsedJson = JSON.parse(extractJsonObjectCandidate(rawContent));
    try {
      parsed = RAW_RESPONSE_SCHEMA.parse(parsedJson);
    } catch {
      const normalized = normalizeLooseResponse(
        parsedJson,
        snapshot,
        grounding.contextLabel
      );
      if (!normalized) {
        throw new Error("LLM response schema mismatch: normalized answer empty");
      }

      const sanitizedLoose = sanitizeGestaoAnalystResponse(
        normalized,
        snapshot,
        input.availableViews
      );

      return {
        ...sanitizedLoose,
        contextLabel: sanitizedLoose.contextLabel || grounding.contextLabel,
      };
    }
  } catch (parseError) {
    const isJson = parseError instanceof SyntaxError;
    if (isJson) {
      return buildFallbackAnalystResponse(
        rawContent,
        grounding.contextLabel,
        snapshot
      );
    }

    if (
      parseError instanceof Error &&
      parseError.message.includes("LLM response schema mismatch")
    ) {
      return buildFallbackAnalystResponse(
        rawContent,
        grounding.contextLabel,
        snapshot
      );
    }

    throw new Error(
      `LLM response schema mismatch: ${parseError instanceof Error ? parseError.message : String(parseError)}`
    );
  }

  const sanitized = sanitizeGestaoAnalystResponse(
    parsed,
    snapshot,
    input.availableViews
  );

  return {
    ...sanitized,
    contextLabel: sanitized.contextLabel || grounding.contextLabel,
  };
}
