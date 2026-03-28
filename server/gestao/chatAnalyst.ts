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

function buildSystemPrompt() {
  return [
    "Você é um analista de BI executivo sênior, em PT-BR, orientado à decisão.",
    "Você responde somente com base no grounding fornecido.",
    "Nunca invente números, nunca cite dados fora do recorte atual.",
    "Sempre explique o contexto analisado no answer de forma curta e executiva.",
    "Você pode recomendar apenas ações de navegação permitidas.",
    "Ações permitidas: apply_filter, clear_filter, set_comparison_preset, set_granularity, toggle_sem_comissao, apply_saved_view.",
    "Nunca recomende sync, exportação, alteração de meta ou mudança de dados.",
    "Prefira no máximo 4 ações e 3 perguntas de follow-up.",
  ].join(" ");
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
      ...buildConversationHistory(input.messages),
      {
        role: "user",
        content: [
          `Pergunta do gestor: ${input.question}`,
          "Grounding estruturado do recorte atual:",
          JSON.stringify(grounding),
          "Responda em JSON com os campos answer, evidence, riskLevel, recommendedActions, followUpPrompts e contextLabel.",
        ].join("\n\n"),
      },
    ],
    responseFormat: { type: "json_object" },
    maxTokens: 1200,
  });

  const content = extractContentText(llmResponse.choices[0]?.message.content ?? "");
  const parsed = RAW_RESPONSE_SCHEMA.parse(JSON.parse(content));
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
