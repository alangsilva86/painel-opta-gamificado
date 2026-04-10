import { z } from "zod";
import { invokeLLM, type Message } from "../_core/llm";
import type {
  FinanceiroInvestigationPack,
  ResumoFinanceiro,
  SerieHistoricaItem,
} from "../procfy/resumoFinanceiro";
import { shiftMonthKey } from "../procfy/resumoFinanceiro";

const MONTH_SCHEMA = z.string().regex(/^\d{4}-\d{2}$/);
const CHAT_ROLE_SCHEMA = z.enum(["user", "assistant", "system"]);
const DECISION_STATUS_SCHEMA = z.enum(["good", "watch", "critical"]);
const DRIVER_DIRECTION_SCHEMA = z.enum(["positive", "negative", "neutral"]);
const ACTION_URGENCY_SCHEMA = z.enum(["now", "this_week", "monitor"]);
const ACTION_TRANSACTION_TYPE_SCHEMA = z.enum(["all", "revenue", "expense"]);
const CONFIDENCE_SCHEMA = z.enum(["low", "medium", "high"]);

export const FINANCEIRO_ANALYST_FOCUS_SCHEMA = z.enum([
  "overview",
  "cash",
  "costs",
  "people",
  "accounts",
  "transactions",
  "reconciliation",
  "comparison",
]);

const RAW_ACTION_META_SCHEMA = z.object({
  label: z.string().optional().default(""),
  ownerHint: z.string().max(40).optional().default(""),
  urgency: ACTION_URGENCY_SCHEMA.optional().default("monitor"),
});

const RAW_FINANCEIRO_ACTION_SCHEMA = z.discriminatedUnion("type", [
  RAW_ACTION_META_SCHEMA.extend({
    type: z.literal("change_month"),
    mes: MONTH_SCHEMA,
  }),
  RAW_ACTION_META_SCHEMA.extend({
    type: z.literal("compare_months"),
    mes: MONTH_SCHEMA,
    compareMes: MONTH_SCHEMA,
  }),
  RAW_ACTION_META_SCHEMA.extend({
    type: z.literal("open_category"),
    categoria: z.string().min(1).max(120),
    transactionType: ACTION_TRANSACTION_TYPE_SCHEMA.optional().default("expense"),
  }),
  RAW_ACTION_META_SCHEMA.extend({
    type: z.literal("open_transactions"),
    transactionType: ACTION_TRANSACTION_TYPE_SCHEMA.optional().default("all"),
  }),
  RAW_ACTION_META_SCHEMA.extend({
    type: z.literal("filter_transactions"),
    transactionType: ACTION_TRANSACTION_TYPE_SCHEMA.optional().default("all"),
    categoria: z.string().max(120).optional().default(""),
    conta: z.string().max(120).optional().default(""),
  }),
  RAW_ACTION_META_SCHEMA.extend({
    type: z.literal("open_account_risk"),
    conta: z.string().min(1).max(120),
  }),
]);

const RAW_FINANCEIRO_DECISION_SCHEMA = z.object({
  status: DECISION_STATUS_SCHEMA.default("watch"),
  message: z.string().min(1).max(180),
});

const RAW_FINANCEIRO_DRIVER_SCHEMA = z.object({
  title: z.string().min(1).max(80),
  direction: DRIVER_DIRECTION_SCHEMA.default("neutral"),
  metric: z.string().max(80).optional().default(""),
  impact: z.string().min(1).max(120),
  detail: z.string().min(1).max(220),
  ownerHint: z.string().max(40).optional().default(""),
  urgency: ACTION_URGENCY_SCHEMA.optional().default("monitor"),
});

const RAW_FINANCEIRO_CITATION_SCHEMA = z.object({
  label: z.string().min(1).max(60),
  value: z.string().min(1).max(80),
  note: z.string().max(160).optional().default(""),
});

const RAW_FINANCEIRO_RESPONSE_SCHEMA = z.object({
  headline: z.string().min(1).max(120),
  summary: z.string().max(120).optional().default(""),
  decision: RAW_FINANCEIRO_DECISION_SCHEMA,
  narrative: z.string().max(1200).optional().default(""),
  drivers: z.array(RAW_FINANCEIRO_DRIVER_SCHEMA).max(4).default([]),
  actions: z.array(RAW_FINANCEIRO_ACTION_SCHEMA).max(4).default([]),
  citations: z.array(RAW_FINANCEIRO_CITATION_SCHEMA).max(6).default([]),
  confidence: CONFIDENCE_SCHEMA.default("medium"),
  requestedPeriod: MONTH_SCHEMA,
  resolvedPeriod: MONTH_SCHEMA,
  compareTo: MONTH_SCHEMA.optional().default(""),
  warnings: z.array(z.string()).max(4).default([]),
  followUpPrompts: z.array(z.string()).max(5).default([]),
  contextLabel: z.string().optional().default(""),
});

export const FINANCEIRO_CHAT_ANALYST_INPUT_SCHEMA = z.object({
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
  mes: MONTH_SCHEMA,
  requestedPeriod: MONTH_SCHEMA.optional(),
  compareTo: MONTH_SCHEMA.nullable().optional(),
  focus: FINANCEIRO_ANALYST_FOCUS_SCHEMA.optional().default("overview"),
});

export type FinanceiroAnalystInput = z.infer<
  typeof FINANCEIRO_CHAT_ANALYST_INPUT_SCHEMA
>;
export type FinanceiroAnalystFocus = z.infer<
  typeof FINANCEIRO_ANALYST_FOCUS_SCHEMA
>;
export type FinanceiroAnalystAction = z.infer<
  typeof RAW_FINANCEIRO_ACTION_SCHEMA
>;
export type FinanceiroAnalystResponse = z.infer<
  typeof RAW_FINANCEIRO_RESPONSE_SCHEMA
>;

type DecisionStatus = z.infer<typeof DECISION_STATUS_SCHEMA>;
type DriverDirection = z.infer<typeof DRIVER_DIRECTION_SCHEMA>;
type ActionUrgency = z.infer<typeof ACTION_URGENCY_SCHEMA>;
type Confidence = z.infer<typeof CONFIDENCE_SCHEMA>;
type QuestionIntent =
  | "overview"
  | "comparison"
  | "reconciliation"
  | "people"
  | "cash"
  | "accounts"
  | "costs"
  | "revenue"
  | "transactions";

type FinanceiroAnalystContextResolution = {
  requestedPeriod: string;
  resolvedPeriod: string;
  compareTo: string | null;
  focus: FinanceiroAnalystFocus;
  questionIntents: QuestionIntent[];
  warnings: string[];
  boundaryChanged: boolean;
};

type FinanceiroComparisonSummary = {
  referenceMes: string;
  referenceLabel: string;
  revenueDeltaPct: number | null;
  totalCostsDeltaPct: number | null;
  resultDeltaPct: number | null;
  marginDeltaPct: number | null;
  largestCostDelta:
    | {
        categoria: string;
        tipo: string;
        delta: number;
      }
    | null;
};

type FinanceiroAnalystSignals = {
  decisionStatus: DecisionStatus;
  marginPct: number;
  marginLabel: string;
  totalCostRatioPct: number;
  totalCostRatioLabel: string;
  resultNegativo: boolean;
  caixaNegativo: boolean;
  negativeAccountCount: number;
  trend:
    | "melhora_consistente"
    | "deterioracao_consistente"
    | "volatil"
    | "insuficiente";
  topCostDriver:
    | {
        categoria: string;
        valor: string;
        pctOfCosts: string;
        tipo: string;
      }
    | null;
  topPayrollDriver:
    | {
        categoria: string;
        valor: string;
        pctOfPayroll: string;
      }
    | null;
  peopleCostShareLabel: string;
};

type GenerateFinanceiroAnalystResponseArgs = {
  input: FinanceiroAnalystInput;
  resolvedContext: FinanceiroAnalystContextResolution;
  resumo: ResumoFinanceiro;
  serie: SerieHistoricaItem[];
  investigation: FinanceiroInvestigationPack;
  comparisonResumo?: ResumoFinanceiro | null;
  comparisonInvestigation?: FinanceiroInvestigationPack | null;
};

const MONTH_ALIASES: Record<string, string> = {
  janeiro: "01",
  jan: "01",
  fevereiro: "02",
  fev: "02",
  marco: "03",
  mar: "03",
  abril: "04",
  abr: "04",
  maio: "05",
  junho: "06",
  jun: "06",
  julho: "07",
  jul: "07",
  agosto: "08",
  ago: "08",
  setembro: "09",
  set: "09",
  outubro: "10",
  out: "10",
  novembro: "11",
  nov: "11",
  dezembro: "12",
  dez: "12",
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

function formatMonthLabel(mes: string) {
  return new Date(`${mes}-01T00:00:00Z`).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter(value => {
    const key = value.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getActionUrgencyLabel(urgency: ActionUrgency) {
  if (urgency === "now") return "Agora";
  if (urgency === "this_week") return "Esta semana";
  return "Monitorar";
}

function buildContextLabel(
  resolvedContext: FinanceiroAnalystContextResolution,
  resumo: ResumoFinanceiro
) {
  const label = formatMonthLabel(resolvedContext.resolvedPeriod);
  const resultLabel =
    resumo.caixa.resultadoLiquido >= 0 ? "resultado positivo" : "resultado negativo";
  const compareLabel = resolvedContext.compareTo
    ? ` • comparação com ${formatMonthLabel(resolvedContext.compareTo)}`
    : "";
  const focusLabel =
    resolvedContext.focus === "overview"
      ? ""
      : ` • foco ${resolvedContext.focus.replace("_", " ")}`;

  return `${label} • ${resultLabel}${compareLabel}${focusLabel}`;
}

function extractMonthMentions(question: string, inputMes: string) {
  const defaultYear = inputMes.slice(0, 4);
  const normalized = normalizeText(question);
  const mentions: string[] = [];

  const numericRegex = /\b(20\d{2})-(0[1-9]|1[0-2])\b/g;
  for (const match of normalized.matchAll(numericRegex)) {
    mentions.push(`${match[1]}-${match[2]}`);
  }

  const monthKeys = Object.keys(MONTH_ALIASES).sort((a, b) => b.length - a.length);
  const monthRegex = new RegExp(
    `\\b(${monthKeys.join("|")})(?:\\s+de)?\\s*(20\\d{2})?\\b`,
    "g"
  );

  for (const match of normalized.matchAll(monthRegex)) {
    const month = MONTH_ALIASES[match[1]];
    const year = match[2] || defaultYear;
    mentions.push(`${year}-${month}`);
  }

  return dedupeStrings(mentions);
}

function detectQuestionIntents(
  question: string,
  focus: FinanceiroAnalystFocus
): QuestionIntent[] {
  const normalized = normalizeText(question);
  const intents = new Set<QuestionIntent>(["overview"]);

  if (
    focus === "comparison" ||
    /\b(compare|comparar|comparacao|comparativo|versus|vs|mudou|mudanca|contra)\b/.test(
      normalized
    )
  ) {
    intents.add("comparison");
  }

  if (
    focus === "reconciliation" ||
    /\b(como chegamos|reconcili|ponte|restante|compoe|compoem|somam|soma|totaliza)\b/.test(
      normalized
    )
  ) {
    intents.add("reconciliation");
  }

  if (
    focus === "people" ||
    /\b(pessoas|folha|salario|salarios|bonus|bonificacao|pro labore|equipe)\b/.test(
      normalized
    )
  ) {
    intents.add("people");
  }

  if (
    focus === "cash" ||
    /\b(caixa|liquidez|fluxo de caixa|fluxo|recebimento)\b/.test(normalized)
  ) {
    intents.add("cash");
  }

  if (
    focus === "accounts" ||
    /\b(conta|banco|bradesco|saldo bancario|saldos)\b/.test(normalized)
  ) {
    intents.add("accounts");
  }

  if (
    focus === "costs" ||
    /\b(despesa|despesas|custo|custos|gasto|gastos)\b/.test(normalized)
  ) {
    intents.add("costs");
  }

  if (
    /\b(receita|receitas|competencia|comissao|comissao opta|venda|vendas)\b/.test(
      normalized
    )
  ) {
    intents.add("revenue");
  }

  if (
    focus === "transactions" ||
    /\b(transacao|transacoes|lancamento|lancamentos|drilldown)\b/.test(normalized)
  ) {
    intents.add("transactions");
  }

  return Array.from(intents);
}

function resolveFocus(
  explicitFocus: FinanceiroAnalystFocus,
  question: string
): FinanceiroAnalystFocus {
  if (explicitFocus !== "overview") return explicitFocus;
  const intents = detectQuestionIntents(question, explicitFocus);
  if (intents.includes("reconciliation")) return "reconciliation";
  if (intents.includes("people")) return "people";
  if (intents.includes("cash")) return "cash";
  if (intents.includes("accounts")) return "accounts";
  if (intents.includes("costs")) return "costs";
  if (intents.includes("transactions")) return "transactions";
  if (intents.includes("comparison")) return "comparison";
  return "overview";
}

export function resolveFinanceiroAnalystContext(
  input: FinanceiroAnalystInput
): FinanceiroAnalystContextResolution {
  const normalizedQuestion = normalizeText(input.question);
  const monthMentions = extractMonthMentions(
    input.question,
    input.requestedPeriod ?? input.mes
  );
  const hasComparisonLanguage =
    /\b(compare|comparar|comparacao|comparativo|versus|vs|contra|mudou|mudanca)\b/.test(
      normalizedQuestion
    );
  const referencesPreviousPeriod =
    /\b(mes anterior|mes passado|periodo anterior|ultimo mes)\b/.test(
      normalizedQuestion
    );

  let requestedPeriod = input.requestedPeriod ?? input.mes;
  let compareTo = input.compareTo ?? null;

  if (monthMentions.length >= 2 && hasComparisonLanguage) {
    requestedPeriod = input.requestedPeriod ?? monthMentions[0];
    compareTo = compareTo ?? monthMentions[1];
  } else if (
    monthMentions.length === 1 &&
    hasComparisonLanguage &&
    !input.requestedPeriod
  ) {
    requestedPeriod = input.mes;
    compareTo = compareTo ?? monthMentions[0];
  } else if (monthMentions.length >= 1 && !input.requestedPeriod) {
    requestedPeriod = monthMentions[0];
  } else if (
    referencesPreviousPeriod &&
    !input.requestedPeriod &&
    !hasComparisonLanguage
  ) {
    requestedPeriod = shiftMonthKey(input.mes, -1);
  }

  if (!compareTo && hasComparisonLanguage) {
    compareTo = shiftMonthKey(requestedPeriod, -1);
  }

  if (!compareTo && referencesPreviousPeriod && requestedPeriod === input.mes) {
    compareTo = shiftMonthKey(requestedPeriod, -1);
  }

  if (compareTo === requestedPeriod) {
    compareTo = null;
  }

  const focus = resolveFocus(input.focus ?? "overview", input.question);
  const questionIntents = detectQuestionIntents(input.question, focus);
  const warnings: string[] = [];

  if (requestedPeriod !== input.mes) {
    warnings.push(
      `Pergunta resolvida para ${formatMonthLabel(requestedPeriod)}, diferente do mês aberto na tela.`
    );
  }

  if (compareTo) {
    warnings.push(`Comparação preparada com ${formatMonthLabel(compareTo)}.`);
  }

  return {
    requestedPeriod,
    resolvedPeriod: requestedPeriod,
    compareTo,
    focus,
    questionIntents,
    warnings,
    boundaryChanged:
      requestedPeriod !== input.mes || (compareTo ?? "") !== (input.compareTo ?? ""),
  };
}

function buildComparisonSummary(
  resumo: ResumoFinanceiro,
  investigation: FinanceiroInvestigationPack,
  comparisonResumo: ResumoFinanceiro | null | undefined,
  comparisonInvestigation: FinanceiroInvestigationPack | null | undefined,
  referenceMes: string | null
): FinanceiroComparisonSummary | null {
  if (!comparisonResumo || !comparisonInvestigation || !referenceMes) return null;

  const currentMargin =
    resumo.caixa.totalReceitas > 0
      ? resumo.caixa.resultadoLiquido / resumo.caixa.totalReceitas
      : 0;
  const referenceMargin =
    comparisonResumo.caixa.totalReceitas > 0
      ? comparisonResumo.caixa.resultadoLiquido / comparisonResumo.caixa.totalReceitas
      : 0;

  const categoryDeltaMap = new Map<string, number>();
  investigation.topExpenseCategories.forEach(item => {
    const key = `${item.tipo}:${item.categoria}`;
    categoryDeltaMap.set(key, item.valor);
  });
  comparisonInvestigation.topExpenseCategories.forEach(item => {
    const key = `${item.tipo}:${item.categoria}`;
    categoryDeltaMap.set(key, (categoryDeltaMap.get(key) ?? 0) - item.valor);
  });

  let largestCostDelta: FinanceiroComparisonSummary["largestCostDelta"] = null;
  for (const [key, delta] of categoryDeltaMap.entries()) {
    if (!largestCostDelta || Math.abs(delta) > Math.abs(largestCostDelta.delta)) {
      const [tipo, categoria] = key.split(":");
      largestCostDelta = { categoria, tipo, delta };
    }
  }

  const deltaPct = (currentValue: number, previousValue: number) => {
    if (previousValue === 0) {
      return currentValue === 0 ? 0 : 1;
    }
    return (currentValue - previousValue) / Math.abs(previousValue);
  };

  return {
    referenceMes,
    referenceLabel: formatMonthLabel(referenceMes),
    revenueDeltaPct: deltaPct(
      resumo.caixa.totalReceitas,
      comparisonResumo.caixa.totalReceitas
    ),
    totalCostsDeltaPct: deltaPct(
      investigation.totalCosts,
      comparisonInvestigation.totalCosts
    ),
    resultDeltaPct: deltaPct(
      resumo.caixa.resultadoLiquido,
      comparisonResumo.caixa.resultadoLiquido
    ),
    marginDeltaPct: deltaPct(currentMargin, referenceMargin),
    largestCostDelta,
  };
}

function buildAnalystSignals(
  resumo: ResumoFinanceiro,
  investigation: FinanceiroInvestigationPack,
  serie: SerieHistoricaItem[]
): FinanceiroAnalystSignals {
  const totalReceitas = resumo.caixa.totalReceitas;
  const marginPct =
    totalReceitas > 0 ? resumo.caixa.resultadoLiquido / totalReceitas : 0;
  const totalCostRatioPct =
    totalReceitas > 0 ? investigation.totalCosts / totalReceitas : 0;
  const negativeAccountCount = investigation.accountRisk.filter(
    item => item.status === "negative"
  ).length;
  const topCostDriver = investigation.topExpenseCategories[0];
  const topPayrollDriver = investigation.payrollBreakdown[0];
  const payrollShare =
    investigation.totalCosts > 0
      ? resumo.caixa.totalFolha / investigation.totalCosts
      : 0;

  const last3Results = serie.slice(-3).map(item => item.resultado);
  let trend: FinanceiroAnalystSignals["trend"] = "insuficiente";
  if (last3Results.length >= 3) {
    const improving =
      last3Results[2] > last3Results[1] && last3Results[1] > last3Results[0];
    const worsening =
      last3Results[2] < last3Results[1] && last3Results[1] < last3Results[0];
    trend = improving
      ? "melhora_consistente"
      : worsening
        ? "deterioracao_consistente"
        : "volatil";
  }

  let decisionStatus: DecisionStatus = "good";
  if (
    resumo.caixa.resultadoLiquido < 0 ||
    marginPct < 0.05 ||
    negativeAccountCount > 0
  ) {
    decisionStatus = "critical";
  } else if (
    marginPct < 0.15 ||
    totalCostRatioPct > 0.85 ||
    trend === "deterioracao_consistente"
  ) {
    decisionStatus = "watch";
  }

  return {
    decisionStatus,
    marginPct,
    marginLabel: formatPercent(marginPct),
    totalCostRatioPct,
    totalCostRatioLabel: formatPercent(totalCostRatioPct),
    resultNegativo: resumo.caixa.resultadoLiquido < 0,
    caixaNegativo: negativeAccountCount > 0,
    negativeAccountCount,
    trend,
    topCostDriver: topCostDriver
      ? {
          categoria: topCostDriver.categoria,
          valor: formatCurrency(topCostDriver.valor),
          pctOfCosts: formatPercent(topCostDriver.pctOfCosts),
          tipo: topCostDriver.tipo,
        }
      : null,
    topPayrollDriver: topPayrollDriver
      ? {
          categoria: topPayrollDriver.categoria,
          valor: formatCurrency(topPayrollDriver.valor),
          pctOfPayroll: formatPercent(topPayrollDriver.pctOfPayroll),
        }
      : null,
    peopleCostShareLabel: formatPercent(payrollShare),
  };
}

function buildFinanceiroAnalystGrounding({
  input,
  resolvedContext,
  resumo,
  serie,
  investigation,
  comparisonResumo,
  comparisonInvestigation,
}: GenerateFinanceiroAnalystResponseArgs) {
  const contextLabel = buildContextLabel(resolvedContext, resumo);
  const comparisonSummary = buildComparisonSummary(
    resumo,
    investigation,
    comparisonResumo,
    comparisonInvestigation,
    resolvedContext.compareTo
  );
  const analystSignals = buildAnalystSignals(resumo, investigation, serie);
  const totalCaixa = resumo.caixa.saldosContas.reduce((acc, item) => acc + item.saldo, 0);

  return {
    contextLabel,
    resolvedContext: {
      mesNaTela: input.mes,
      requestedPeriod: resolvedContext.requestedPeriod,
      resolvedPeriod: resolvedContext.resolvedPeriod,
      compareTo: resolvedContext.compareTo,
      focus: resolvedContext.focus,
      questionIntents: resolvedContext.questionIntents,
      boundaryChanged: resolvedContext.boundaryChanged,
    },
    kpis: {
      totalReceitas: formatCurrency(resumo.caixa.totalReceitas),
      totalCustos: formatCurrency(investigation.totalCosts),
      totalFolha: formatCurrency(resumo.caixa.totalFolha),
      totalImpostos: formatCurrency(resumo.caixa.totalImpostos),
      resultadoLiquido: formatCurrency(resumo.caixa.resultadoLiquido),
      margemOperacional: analystSignals.marginLabel,
      caixaTotal: formatCurrency(totalCaixa),
    },
    competencia: {
      comissaoOpta: formatCurrency(resumo.competencia.comissaoOpta),
      receitaBruta: formatCurrency(resumo.competencia.receitaBruta),
      quantidadeContratos: resumo.competencia.quantidadeContratos,
      topProdutos: resumo.competencia.porProduto.slice(0, 5).map(item => ({
        produto: item.produto,
        valor: formatCurrency(item.valor),
        pct: formatPercent(item.pct),
      })),
      topVendedores: resumo.competencia.porVendedor.slice(0, 5).map(item => ({
        vendedor: item.vendedor,
        valor: formatCurrency(item.valor),
        pct: formatPercent(item.pct),
      })),
    },
    gapAnalysis: {
      comissaoOpta: formatCurrency(resumo.competencia.comissaoOpta),
      receitaCaixa: formatCurrency(resumo.caixa.totalReceitas),
      gap: formatCurrency(resumo.comparativo.gap),
      ratioComissaoVsCaixa: formatPercent(resumo.comparativo.comissaoVsReceitaCaixa),
      interpretacao:
        resumo.comparativo.gap > 0
          ? "Caixa acima da competência."
          : resumo.comparativo.gap < 0
            ? "Competência acima do caixa."
            : "Competência e caixa alinhados.",
    },
    costBridge: {
      totalCosts: formatCurrency(investigation.totalCosts),
      typeBreakdown: investigation.typeBreakdown.map(item => ({
        label: item.label,
        valor: formatCurrency(item.valor),
        pctOfCosts: formatPercent(item.pctOfCosts),
        pctOfRevenue: formatPercent(item.pctOfRevenue),
      })),
      categoryBridge: investigation.categoryBridge.map(item => ({
        label: item.label,
        valor: formatCurrency(item.valor),
        pctOfCosts: formatPercent(item.pctOfCosts),
      })),
      topExpenseCategories: investigation.topExpenseCategories.map(item => ({
        categoria: item.categoria,
        tipo: item.tipo,
        valor: formatCurrency(item.valor),
        pctOfCosts: formatPercent(item.pctOfCosts),
        pctWithinType: formatPercent(item.pctWithinType),
      })),
      payrollBreakdown: investigation.payrollBreakdown.map(item => ({
        categoria: item.categoria,
        valor: formatCurrency(item.valor),
        pctOfPayroll: formatPercent(item.pctOfPayroll),
      })),
    },
    bankAccounts: investigation.accountRisk.map(item => ({
      conta: item.conta,
      saldo: formatCurrency(item.saldo),
      status: item.status,
    })),
    transactionSamples: {
      topExpenseTransactions: investigation.topExpenseTransactions.slice(0, 6).map(item => ({
        dataPagamento: item.dataPagamento,
        name: item.name,
        categoria: item.categoria,
        conta: item.conta,
        contato: item.contato,
        valor: formatCurrency(item.valor),
      })),
      topRevenueTransactions: investigation.topRevenueTransactions.slice(0, 4).map(item => ({
        dataPagamento: item.dataPagamento,
        name: item.name,
        categoria: item.categoria,
        conta: item.conta,
        contato: item.contato,
        valor: formatCurrency(item.valor),
      })),
    },
    comparison: comparisonSummary
      ? {
          referenceMes: comparisonSummary.referenceMes,
          referenceLabel: comparisonSummary.referenceLabel,
          revenueDeltaPct: formatPercent(comparisonSummary.revenueDeltaPct ?? 0),
          totalCostsDeltaPct: formatPercent(comparisonSummary.totalCostsDeltaPct ?? 0),
          resultDeltaPct: formatPercent(comparisonSummary.resultDeltaPct ?? 0),
          marginDeltaPct: formatPercent(comparisonSummary.marginDeltaPct ?? 0),
          largestCostDelta: comparisonSummary.largestCostDelta
            ? {
                categoria: comparisonSummary.largestCostDelta.categoria,
                tipo: comparisonSummary.largestCostDelta.tipo,
                delta: formatCurrency(comparisonSummary.largestCostDelta.delta),
              }
            : null,
          referenceKpis: comparisonResumo
            ? {
                totalReceitas: formatCurrency(comparisonResumo.caixa.totalReceitas),
                totalCustos: formatCurrency(comparisonInvestigation?.totalCosts ?? 0),
                resultadoLiquido: formatCurrency(comparisonResumo.caixa.resultadoLiquido),
                margemOperacional:
                  comparisonResumo.caixa.totalReceitas > 0
                    ? formatPercent(
                        comparisonResumo.caixa.resultadoLiquido /
                          comparisonResumo.caixa.totalReceitas
                      )
                    : "0.0%",
              }
            : null,
        }
      : null,
    serieHistorica: serie.map(item => ({
      mes: item.mes,
      label: formatMonthLabel(item.mes),
      competencia: formatCurrency(item.competencia / 100),
      receitas: formatCurrency(item.receitas / 100),
      despesas: formatCurrency(item.despesas / 100),
      resultado: formatCurrency(item.resultado / 100),
    })),
    analystSignals,
  };
}

function buildSystemPrompt() {
  return `# Papel
Você é o SO Executivo Financeiro da Opta. Seu público é CEO + COO. Responda sempre em PT-BR.

# Missão
Transforme o grounding financeiro em decisão executiva, causa raiz, impacto e plano de ação imediato. Você não é um chatbot genérico; você é um conselheiro operacional para priorização semanal.

# Regras duras
- Use SOMENTE o GROUNDING ESTRUTURADO fornecido.
- Nunca invente meses, categorias, contas, percentuais ou somas.
- Se um detalhe não existir no grounding, diga "não disponível para este período".
- Se requestedPeriod diferir do mês da tela, trate resolvedPeriod como a única verdade analítica.
- Não use listas longas na narrativa. Seja direto.

# Como responder
1. Decida primeiro: bom, atenção ou crítico.
2. Explique o principal driver financeiro com números.
3. Mostre 2-4 drivers que realmente mudam a decisão.
4. Cite provas com valor + contexto.
5. Sugira até 4 ações objetivas com ownerHint e urgency.
6. Informe confiança da leitura.

# Qualidade esperada
- Headline: 1 frase executiva.
- decision.message: a decisão em linguagem de diretoria.
- narrative: 2-4 frases curtas conectando causa, impacto e prioridade.
- drivers: cada item precisa dizer o que é, qual impacto e por que importa.
- citations: curto e verificável.
- actions: orientadas a navegação/investigação dentro do painel.
- followUpPrompts: perguntas que um fundador faria em seguida.

# Formato JSON obrigatório
{
  "headline": "Frase executiva",
  "summary": "Resumo opcional de apoio",
  "decision": { "status": "good | watch | critical", "message": "Decisão executiva" },
  "narrative": "Explicação curta",
  "drivers": [
    {
      "title": "Nome do driver",
      "direction": "positive | negative | neutral",
      "metric": "Valor curto",
      "impact": "Impacto no negócio",
      "detail": "Explicação direta",
      "ownerHint": "Financeiro | COO | CEO | Comercial | Operações",
      "urgency": "now | this_week | monitor"
    }
  ],
  "actions": [
    {
      "type": "change_month | compare_months | open_category | open_transactions | filter_transactions | open_account_risk",
      "label": "Texto do botão",
      "ownerHint": "Financeiro | COO | CEO | Comercial | Operações",
      "urgency": "now | this_week | monitor"
    }
  ],
  "citations": [
    { "label": "Métrica", "value": "Valor", "note": "Contexto" }
  ],
  "confidence": "high | medium | low",
  "requestedPeriod": "YYYY-MM",
  "resolvedPeriod": "YYYY-MM",
  "compareTo": "YYYY-MM",
  "warnings": ["Aviso 1"],
  "followUpPrompts": ["Pergunta 1?", "Pergunta 2?"],
  "contextLabel": "Descrição curta"
}`;
}

function buildConversationHistory(
  messages: FinanceiroAnalystInput["messages"],
  resolvedContext: FinanceiroAnalystContextResolution
) {
  if (resolvedContext.boundaryChanged) return [];
  return messages
    .filter(message => message.role !== "system")
    .slice(-8)
    .map<Message>(message => ({
      role: message.role,
      content: message.content,
    }));
}

function buildNoDataResponse(
  input: FinanceiroAnalystInput,
  resolvedContext: FinanceiroAnalystContextResolution
): FinanceiroAnalystResponse {
  const label = formatMonthLabel(resolvedContext.resolvedPeriod);
  const actions: FinanceiroAnalystAction[] = [];
  if (resolvedContext.resolvedPeriod !== input.mes) {
    actions.push({
      type: "change_month",
      label: `Abrir ${label} na tela`,
      mes: resolvedContext.resolvedPeriod,
      ownerHint: "Financeiro",
      urgency: "monitor",
    });
  }

  return {
    headline: `Sem base financeira carregada para ${label}.`,
    summary: "Sem dados no período resolvido.",
    decision: {
      status: "watch",
      message: "Sem dados para decidir; primeiro valide a sincronização do período.",
    },
    narrative:
      `Não há dados financeiros materializados para ${label}. ` +
      "A próxima ação é sincronizar o Procfy ou abrir um período com movimentação.",
    drivers: [
      {
        title: "Base vazia",
        direction: "neutral",
        metric: label,
        impact: "Sem base confiável para leitura executiva.",
        detail: "Nenhuma receita, custo ou contrato materializado neste período.",
        ownerHint: "Financeiro",
        urgency: "this_week",
      },
    ],
    actions,
    citations: [
      {
        label: "Período resolvido",
        value: label,
        note: "Nenhum dado financeiro encontrado.",
      },
      {
        label: "Próxima etapa",
        value: "Sincronizar Procfy",
        note: "Sem sincronização não há análise confiável.",
      },
    ],
    confidence: "low",
    requestedPeriod: resolvedContext.requestedPeriod,
    resolvedPeriod: resolvedContext.resolvedPeriod,
    compareTo: resolvedContext.compareTo ?? "",
    warnings: dedupeStrings(resolvedContext.warnings),
    followUpPrompts: [
      "Qual foi o último mês com dados disponíveis?",
      "A sincronização do Procfy já foi executada para esse período?",
    ],
    contextLabel: `${label} • sem dados`,
  };
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

function toMonthOrEmpty(value: unknown) {
  const month = toCleanString(value);
  return /^\d{4}-\d{2}$/.test(month) ? month : "";
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

function normalizeConfidence(value: unknown): Confidence | "" {
  const normalized = toCleanString(value).toLowerCase();
  if (normalized === "high" || normalized === "alta") return "high";
  if (normalized === "medium" || normalized === "media" || normalized === "média")
    return "medium";
  if (normalized === "low" || normalized === "baixa") return "low";
  return "";
}

function normalizeDecision(
  value: unknown
): FinanceiroAnalystResponse["decision"] | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const status = toCleanString(record.status).toLowerCase();
  const message = toCleanString(record.message);
  if (!message) return null;

  return {
    status:
      status === "good" || status === "bom"
        ? "good"
        : status === "critical" || status === "critico" || status === "crítico"
          ? "critical"
          : "watch",
    message,
  };
}

function normalizeDrivers(value: unknown): FinanceiroAnalystResponse["drivers"] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = toCleanString(record.title);
      const impact = toCleanString(record.impact);
      const detail = toCleanString(record.detail);
      if (!title || !impact || !detail) return null;

      const direction = toCleanString(record.direction).toLowerCase();
      const urgency = toCleanString(record.urgency).toLowerCase();

      return {
        title,
        direction:
          direction === "positive" || direction === "positivo"
            ? "positive"
            : direction === "negative" || direction === "negativo"
              ? "negative"
              : "neutral",
        metric: toCleanString(record.metric),
        impact,
        detail,
        ownerHint: toCleanString(record.ownerHint),
        urgency:
          urgency === "now" || urgency === "agora"
            ? "now"
            : urgency === "this_week" || urgency === "esta_semana"
              ? "this_week"
              : "monitor",
      } satisfies FinanceiroAnalystResponse["drivers"][number];
    })
    .filter(Boolean) as FinanceiroAnalystResponse["drivers"];
}

function normalizeCitations(
  citationsValue: unknown,
  evidenceValue: unknown
): FinanceiroAnalystResponse["citations"] {
  if (Array.isArray(citationsValue)) {
    const citations = citationsValue
      .map(item => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const label = toCleanString(record.label);
        const value = toCleanString(record.value);
        const note = toCleanString(record.note);
        if (!label || !value) return null;
        return { label, value, note };
      })
      .filter(Boolean) as FinanceiroAnalystResponse["citations"];

    if (citations.length > 0) return citations;
  }

  return toStringArray(evidenceValue).map((item, index) => ({
    label: `Prova ${index + 1}`,
    value: item,
    note: "",
  }));
}

function normalizeAction(value: unknown): FinanceiroAnalystAction | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const type = toCleanString(record.type);
  const label = toCleanString(record.label);
  const ownerHint = toCleanString(record.ownerHint);
  const urgency = toCleanString(record.urgency).toLowerCase();
  const normalizedUrgency: ActionUrgency =
    urgency === "now" || urgency === "agora"
      ? "now"
      : urgency === "this_week" || urgency === "esta_semana"
        ? "this_week"
        : "monitor";

  if (type === "change_month") {
    const mes = toMonthOrEmpty(record.mes);
    if (!mes) return null;
    return {
      type,
      label,
      mes,
      ownerHint,
      urgency: normalizedUrgency,
    };
  }

  if (type === "compare_months") {
    const mes = toMonthOrEmpty(record.mes);
    const compareMes = toMonthOrEmpty(record.compareMes);
    if (!mes || !compareMes || mes === compareMes) return null;
    return {
      type,
      label,
      mes,
      compareMes,
      ownerHint,
      urgency: normalizedUrgency,
    };
  }

  if (type === "open_category") {
    const categoria = toCleanString(record.categoria);
    if (!categoria) return null;
    const transactionType = toCleanString(record.transactionType).toLowerCase();
    return {
      type,
      label,
      categoria,
      transactionType:
        transactionType === "revenue"
          ? "revenue"
          : transactionType === "all"
            ? "all"
            : "expense",
      ownerHint,
      urgency: normalizedUrgency,
    };
  }

  if (type === "open_transactions") {
    const transactionType = toCleanString(record.transactionType).toLowerCase();
    return {
      type,
      label,
      transactionType:
        transactionType === "revenue"
          ? "revenue"
          : transactionType === "expense"
            ? "expense"
            : "all",
      ownerHint,
      urgency: normalizedUrgency,
    };
  }

  if (type === "filter_transactions") {
    const categoria = toCleanString(record.categoria);
    const conta = toCleanString(record.conta);
    const transactionType = toCleanString(record.transactionType).toLowerCase();
    if (!categoria && !conta) return null;
    return {
      type,
      label,
      categoria,
      conta,
      transactionType:
        transactionType === "revenue"
          ? "revenue"
          : transactionType === "expense"
            ? "expense"
            : "all",
      ownerHint,
      urgency: normalizedUrgency,
    };
  }

  if (type === "open_account_risk") {
    const conta = toCleanString(record.conta);
    if (!conta) return null;
    return {
      type,
      label,
      conta,
      ownerHint,
      urgency: normalizedUrgency,
    };
  }

  return null;
}

function normalizeActions(value: unknown): FinanceiroAnalystResponse["actions"] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeAction).filter(Boolean) as FinanceiroAnalystResponse["actions"];
}

function normalizeLooseResponse(
  value: unknown
): Partial<FinanceiroAnalystResponse> | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  return {
    headline: toCleanString(record.headline),
    summary: toCleanString(record.summary),
    decision: normalizeDecision(record.decision) ?? undefined,
    narrative: toCleanString(record.narrative || record.answer),
    drivers: normalizeDrivers(record.drivers),
    actions: normalizeActions(record.actions ?? record.recommendedActions),
    citations: normalizeCitations(record.citations, record.evidence),
    confidence: normalizeConfidence(record.confidence) || undefined,
    requestedPeriod: toMonthOrEmpty(record.requestedPeriod) || undefined,
    resolvedPeriod: toMonthOrEmpty(record.resolvedPeriod) || undefined,
    compareTo: toMonthOrEmpty(record.compareTo) || undefined,
    warnings: toStringArray(record.warnings),
    followUpPrompts: toStringArray(record.followUpPrompts),
    contextLabel: toCleanString(record.contextLabel),
  };
}

function buildDriver(
  title: string,
  metric: string,
  impact: string,
  detail: string,
  direction: DriverDirection,
  ownerHint: string,
  urgency: ActionUrgency
): FinanceiroAnalystResponse["drivers"][number] {
  return {
    title,
    metric,
    impact,
    detail,
    direction,
    ownerHint,
    urgency,
  };
}

function buildCitation(label: string, value: string, note: string) {
  return { label, value, note };
}

function appendUniqueAction(
  actions: FinanceiroAnalystAction[],
  action: FinanceiroAnalystAction
) {
  const key = JSON.stringify(action);
  if (actions.some(item => JSON.stringify(item) === key)) return;
  actions.push(action);
}

export function buildFinanceiroExecutiveDefaults({
  input,
  resolvedContext,
  resumo,
  investigation,
  serie,
  comparisonResumo,
  comparisonInvestigation,
}: Omit<GenerateFinanceiroAnalystResponseArgs, "serie"> & {
  serie: SerieHistoricaItem[];
}) {
  const contextLabel = buildContextLabel(resolvedContext, resumo);
  const signals = buildAnalystSignals(resumo, investigation, serie);
  const comparisonSummary = buildComparisonSummary(
    resumo,
    investigation,
    comparisonResumo,
    comparisonInvestigation,
    resolvedContext.compareTo
  );
  const topCost = investigation.topExpenseCategories[0];
  const topPayroll = investigation.payrollBreakdown[0];
  const negativeAccount = investigation.accountRisk.find(
    item => item.status === "negative"
  );
  const warnings = [...resolvedContext.warnings];

  if (investigation.accountRisk.length === 0) {
    warnings.push("Saldos bancários não disponíveis no Procfy para este período.");
  }

  const label = formatMonthLabel(resolvedContext.resolvedPeriod);
  const comparisonText = comparisonSummary?.resultDeltaPct
    ? ` vs ${comparisonSummary.referenceLabel}: ${formatPercent(
        comparisonSummary.resultDeltaPct
      )}`
    : "";

  let headline = `${label} exige atenção sobre custos e liquidez.`;
  if (signals.decisionStatus === "critical") {
    headline = `${label} fechou pressionado: resultado e caixa pedem ação imediata.`;
  } else if (signals.decisionStatus === "good") {
    headline = `${label} sustenta resultado positivo, mas a disciplina de custos segue central.`;
  }

  if (resolvedContext.questionIntents.includes("reconciliation")) {
    headline = `${label}: ${formatCurrency(
      investigation.totalCosts
    )} em custos já reconciliados no painel.`;
  } else if (resolvedContext.questionIntents.includes("people")) {
    headline = `${label}: folha responde por ${signals.peopleCostShareLabel} da base de custos.`;
  } else if (resolvedContext.questionIntents.includes("accounts")) {
    headline = negativeAccount
      ? `${label}: ${negativeAccount.conta} está negativa e pressiona a liquidez.`
      : `${label}: liquidez bancária sem conta negativa, mas requer monitoramento.`;
  }

  let decisionMessage =
    signals.decisionStatus === "critical"
      ? "Prioridade imediata: conter a pressão de custos e proteger o caixa."
      : signals.decisionStatus === "watch"
        ? "A decisão correta agora é atacar os maiores drivers de custo antes que a margem comprima mais."
        : "A operação está estável no período, com espaço para gestão fina de custos e caixa.";

  if (resolvedContext.questionIntents.includes("reconciliation")) {
    decisionMessage =
      "Use a ponte de custos para validar a composição do total antes de decidir cortes.";
  }

  const drivers: FinanceiroAnalystResponse["drivers"] = [];
  appendDriver(
    drivers,
    buildDriver(
      "Resultado líquido",
      formatCurrency(resumo.caixa.resultadoLiquido),
      `Margem operacional em ${signals.marginLabel}${comparisonText}.`,
      signals.decisionStatus === "critical"
        ? "O resultado do período não sustenta conforto operacional."
        : "O resultado do período ainda sustenta a operação, mas precisa de disciplina.",
      resumo.caixa.resultadoLiquido < 0 ? "negative" : "positive",
      "CEO",
      signals.decisionStatus === "critical" ? "now" : "this_week"
    )
  );

  if (topCost) {
    appendDriver(
      drivers,
      buildDriver(
        `Driver de custo: ${topCost.categoria}`,
        formatCurrency(topCost.valor),
        `${formatPercent(topCost.pctOfCosts)} da base de custos do mês.`,
        `É o maior centro de pressão dentro do custo total e merece drilldown imediato em ${topCost.tipo}.`,
        "negative",
        "COO",
        "this_week"
      )
    );
  }

  if (topPayroll && resumo.caixa.totalFolha > 0) {
    appendDriver(
      drivers,
      buildDriver(
        `Folha: ${topPayroll.categoria}`,
        formatCurrency(resumo.caixa.totalFolha),
        `${signals.peopleCostShareLabel} do custo total está em folha.`,
        `${topPayroll.categoria} representa ${formatPercent(
          topPayroll.pctOfPayroll
        )} da folha do período.`,
        "negative",
        "Financeiro",
        resolvedContext.questionIntents.includes("people") ? "now" : "monitor"
      )
    );
  }

  if (negativeAccount) {
    appendDriver(
      drivers,
      buildDriver(
        `Liquidez: ${negativeAccount.conta}`,
        formatCurrency(negativeAccount.saldo),
        "Conta bancária negativa no fechamento do período.",
        "Esse saldo limita capacidade de absorver novas saídas sem reequilibrar caixa.",
        "negative",
        "Financeiro",
        "now"
      )
    );
  } else {
    appendDriver(
      drivers,
      buildDriver(
        "Competência vs caixa",
        formatCurrency(resumo.comparativo.gap),
        `${formatPercent(resumo.comparativo.comissaoVsReceitaCaixa)} da comissão virou caixa.`,
        resumo.comparativo.gap >= 0
          ? "Caixa está acima da competência, sugerindo liquidação de receitas já materializadas."
          : "Competência está acima do caixa, sugerindo receita ainda não convertida em recebimento.",
        resumo.comparativo.gap >= 0 ? "positive" : "negative",
        "COO",
        "monitor"
      )
    );
  }

  const citations: FinanceiroAnalystResponse["citations"] = [
    buildCitation(
      "Resultado líquido",
      formatCurrency(resumo.caixa.resultadoLiquido),
      `Margem ${signals.marginLabel}.`
    ),
    buildCitation(
      "Custos totais",
      formatCurrency(investigation.totalCosts),
      `${signals.totalCostRatioLabel} da receita do período.`
    ),
  ];

  if (topCost) {
    citations.push(
      buildCitation(
        "Maior categoria de custo",
        formatCurrency(topCost.valor),
        `${topCost.categoria} absorveu ${formatPercent(topCost.pctOfCosts)} do custo total.`
      )
    );
  }

  if (topPayroll && resumo.caixa.totalFolha > 0) {
    citations.push(
      buildCitation(
        "Folha",
        formatCurrency(resumo.caixa.totalFolha),
        `${topPayroll.categoria} concentrou ${formatPercent(topPayroll.pctOfPayroll)} da folha.`
      )
    );
  }

  if (negativeAccount) {
    citations.push(
      buildCitation(
        "Conta em risco",
        formatCurrency(negativeAccount.saldo),
        `${negativeAccount.conta} fechou negativa.`
      )
    );
  } else {
    citations.push(
      buildCitation(
        "Gap competência x caixa",
        formatCurrency(resumo.comparativo.gap),
        `${formatPercent(resumo.comparativo.comissaoVsReceitaCaixa)} da comissão foi convertida em caixa.`
      )
    );
  }

  if (comparisonSummary) {
    citations.push(
      buildCitation(
        `Resultado vs ${comparisonSummary.referenceLabel}`,
        formatPercent(comparisonSummary.resultDeltaPct ?? 0),
        "Variação do resultado líquido contra o período de comparação."
      )
    );
  }

  const actions: FinanceiroAnalystAction[] = [];

  if (resolvedContext.resolvedPeriod !== input.mes) {
    appendUniqueAction(actions, {
      type: "change_month",
      label: `Abrir ${formatMonthLabel(resolvedContext.resolvedPeriod)} na tela`,
      mes: resolvedContext.resolvedPeriod,
      ownerHint: "Financeiro",
      urgency: "monitor",
    });
  }

  if (resolvedContext.compareTo) {
    appendUniqueAction(actions, {
      type: "compare_months",
      label: `Comparar ${formatMonthLabel(resolvedContext.resolvedPeriod)} com ${formatMonthLabel(
        resolvedContext.compareTo
      )}`,
      mes: resolvedContext.resolvedPeriod,
      compareMes: resolvedContext.compareTo,
      ownerHint: "CEO",
      urgency: "this_week",
    });
  }

  if (topCost) {
    appendUniqueAction(actions, {
      type: "open_category",
      label: `Abrir ${topCost.categoria} no drilldown`,
      categoria: topCost.categoria,
      transactionType: "expense",
      ownerHint: "COO",
      urgency: signals.decisionStatus === "critical" ? "now" : "this_week",
    });
  }

  if (negativeAccount) {
    appendUniqueAction(actions, {
      type: "open_account_risk",
      label: `Ver lançamentos ligados à ${negativeAccount.conta}`,
      conta: negativeAccount.conta,
      ownerHint: "Financeiro",
      urgency: "now",
    });
  } else {
    appendUniqueAction(actions, {
      type: "open_transactions",
      label: "Abrir despesas do período",
      transactionType: "expense",
      ownerHint: "Financeiro",
      urgency: "this_week",
    });
  }

  const followUpPrompts = resolvedContext.questionIntents.includes("reconciliation")
    ? [
        "Quais categorias completam o restante dos custos?",
        "Quais transações explicam a maior parte dessa categoria?",
        "O que mudou em relação ao mês anterior?",
      ]
    : resolvedContext.questionIntents.includes("people")
      ? [
          "Quais linhas da folha mais pressionaram o mês?",
          "Como a folha mudou contra o período anterior?",
          "Quais despesas fora da folha ainda estão pesando mais?",
        ]
      : [
          "O que mais mudou em relação ao mês anterior?",
          "Quais transações explicam o principal driver de custo?",
          "Qual decisão precisa ser tomada nos próximos 7 dias?",
        ];

  const narrativeParts = [
    `No período ${label}, o resultado líquido ficou em ${formatCurrency(
      resumo.caixa.resultadoLiquido
    )}, com margem operacional de ${signals.marginLabel}.`,
    topCost
      ? `${topCost.categoria} foi o maior driver de custo, consumindo ${formatPercent(
          topCost.pctOfCosts
        )} da base total.`
      : "Não há categoria dominante de custo claramente visível neste período.",
    negativeAccount
      ? `${negativeAccount.conta} encerrou o período negativa em ${formatCurrency(
          negativeAccount.saldo
        )}, elevando o risco de liquidez.`
      : `O gap entre competência e caixa fechou em ${formatCurrency(
          resumo.comparativo.gap
        )}, o que ajuda a explicar o ritmo de conversão em caixa.`,
  ];

  if (comparisonSummary?.largestCostDelta) {
    narrativeParts.push(
      `${comparisonSummary.largestCostDelta.categoria} foi a maior mudança contra ${comparisonSummary.referenceLabel}, com delta de ${formatCurrency(
        comparisonSummary.largestCostDelta.delta
      )}.`
    );
  }

  return {
    headline,
    summary:
      signals.decisionStatus === "critical"
        ? "Período crítico: caixa e custos pressionando a operação."
        : signals.decisionStatus === "watch"
          ? "Período em atenção: margem apertada e custos relevantes."
          : "Período positivo com disciplina de custos ainda necessária.",
    decision: {
      status: signals.decisionStatus,
      message: decisionMessage,
    },
    narrative: narrativeParts.join(" "),
    drivers: drivers.slice(0, 4),
    actions: actions.slice(0, 4),
    citations: citations.slice(0, 6),
    confidence:
      investigation.topExpenseTransactions.length >= 3 && serie.length >= 3
        ? "high"
        : "medium",
    requestedPeriod: resolvedContext.requestedPeriod,
    resolvedPeriod: resolvedContext.resolvedPeriod,
    compareTo: resolvedContext.compareTo ?? "",
    warnings: dedupeStrings(warnings).slice(0, 4),
    followUpPrompts,
    contextLabel,
  } satisfies FinanceiroAnalystResponse;
}

function appendDriver(
  drivers: FinanceiroAnalystResponse["drivers"],
  driver: FinanceiroAnalystResponse["drivers"][number]
) {
  if (drivers.some(item => item.title === driver.title)) return;
  drivers.push(driver);
}

function sanitizeActionLabel(
  action: FinanceiroAnalystAction,
  fallback: FinanceiroAnalystAction
) {
  return action.label.trim().length > 0 ? action.label.trim() : fallback.label;
}

function sanitizeActions(
  actions: FinanceiroAnalystAction[],
  defaults: FinanceiroAnalystAction[],
  investigation: FinanceiroInvestigationPack
) {
  const allowedCategories = new Set(investigation.availableFilters.categorias);
  const allowedAccounts = new Set([
    ...investigation.availableFilters.contas,
    ...investigation.accountRisk.map(item => item.conta),
  ]);

  const sanitized: FinanceiroAnalystAction[] = [];

  actions.forEach(action => {
    const fallback =
      defaults.find(item => item.type === action.type) ??
      defaults[0] ??
      ({
        type: "open_transactions",
        label: "Abrir transações",
        transactionType: "all",
        ownerHint: "Financeiro",
        urgency: "monitor",
      } satisfies FinanceiroAnalystAction);

    if (action.type === "change_month") {
      appendUniqueAction(sanitized, {
        ...action,
        label: sanitizeActionLabel(action, fallback),
      });
      return;
    }

    if (action.type === "compare_months") {
      appendUniqueAction(sanitized, {
        ...action,
        label: sanitizeActionLabel(action, fallback),
      });
      return;
    }

    if (action.type === "open_category") {
      if (!allowedCategories.has(action.categoria)) return;
      appendUniqueAction(sanitized, {
        ...action,
        label: sanitizeActionLabel(action, fallback),
      });
      return;
    }

    if (action.type === "open_transactions") {
      appendUniqueAction(sanitized, {
        ...action,
        label: sanitizeActionLabel(action, fallback),
      });
      return;
    }

    if (action.type === "filter_transactions") {
      if (
        action.categoria &&
        action.categoria.length > 0 &&
        !allowedCategories.has(action.categoria)
      ) {
        return;
      }
      if (action.conta && action.conta.length > 0 && !allowedAccounts.has(action.conta)) {
        return;
      }
      appendUniqueAction(sanitized, {
        ...action,
        label: sanitizeActionLabel(action, fallback),
      });
      return;
    }

    if (!allowedAccounts.has(action.conta)) return;
    appendUniqueAction(sanitized, {
      ...action,
      label: sanitizeActionLabel(action, fallback),
    });
  });

  defaults.forEach(action => appendUniqueAction(sanitized, action));

  return sanitized.slice(0, 4);
}

function sanitizeResponse(
  candidate: Partial<FinanceiroAnalystResponse> | null,
  fallback: FinanceiroAnalystResponse,
  investigation: FinanceiroInvestigationPack
): FinanceiroAnalystResponse {
  const drivers =
    candidate?.drivers && candidate.drivers.length > 0
      ? candidate.drivers.slice(0, 4)
      : fallback.drivers;
  const citations =
    candidate?.citations && candidate.citations.length > 0
      ? candidate.citations
          .map(item => ({
            label: item.label.trim(),
            value: item.value.trim(),
            note: item.note.trim(),
          }))
          .filter(item => item.label && item.value)
          .slice(0, 6)
      : fallback.citations;

  return {
    headline: candidate?.headline?.trim() || fallback.headline,
    summary: candidate?.summary?.trim() || fallback.summary,
    decision:
      candidate?.decision?.message?.trim()
        ? {
            status: candidate.decision.status,
            message: candidate.decision.message.trim(),
          }
        : fallback.decision,
    narrative: candidate?.narrative?.trim() || fallback.narrative,
    drivers,
    actions: sanitizeActions(candidate?.actions ?? [], fallback.actions, investigation),
    citations,
    confidence: candidate?.confidence || fallback.confidence,
    requestedPeriod: fallback.requestedPeriod,
    resolvedPeriod: fallback.resolvedPeriod,
    compareTo: fallback.compareTo,
    warnings: dedupeStrings([
      ...fallback.warnings,
      ...(candidate?.warnings ?? []).map(item => item.trim()),
    ]).slice(0, 4),
    followUpPrompts: dedupeStrings([
      ...(candidate?.followUpPrompts ?? []),
      ...fallback.followUpPrompts,
    ]).slice(0, 5),
    contextLabel: candidate?.contextLabel?.trim() || fallback.contextLabel,
  };
}

export async function generateFinanceiroAnalystResponse(
  params: GenerateFinanceiroAnalystResponseArgs
): Promise<FinanceiroAnalystResponse> {
  const { input, resolvedContext, resumo, serie, investigation } = params;

  if (
    resumo.competencia.quantidadeContratos === 0 &&
    resumo.caixa.totalReceitas === 0 &&
    investigation.totalCosts === 0
  ) {
    return buildNoDataResponse(input, resolvedContext);
  }

  const grounding = buildFinanceiroAnalystGrounding(params);
  const fallback = buildFinanceiroExecutiveDefaults(params);

  const llmResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(),
      },
      {
        role: "user",
        content:
          "## GROUNDING ESTRUTURADO DO SO EXECUTIVO FINANCEIRO\n\n" +
          "Baseie a resposta somente neste grounding. Responda em JSON.\n\n" +
          JSON.stringify(grounding, null, 2),
      },
      {
        role: "assistant",
        content:
          `Grounding recebido. Contexto: ${grounding.contextLabel}. ` +
          `Status: ${grounding.analystSignals.decisionStatus}. ` +
          `Headline base: ${fallback.headline}. Pronto para responder em JSON.`,
      },
      ...buildConversationHistory(input.messages, resolvedContext),
      {
        role: "user",
        content: input.question,
      },
    ],
    responseFormat: { type: "json_object" },
    maxTokens: 2200,
  });

  const rawContent = extractContentText(
    llmResponse.choices[0]?.message.content ?? ""
  );

  try {
    const parsedJson = JSON.parse(extractJsonObjectCandidate(rawContent));
    const strict = RAW_FINANCEIRO_RESPONSE_SCHEMA.safeParse(parsedJson);
    if (strict.success) {
      return sanitizeResponse(strict.data, fallback, investigation);
    }

    return sanitizeResponse(normalizeLooseResponse(parsedJson), fallback, investigation);
  } catch {
    return sanitizeResponse(
      rawContent.trim().length > 0 ? { narrative: unwrapJsonCodeFence(rawContent) } : null,
      fallback,
      investigation
    );
  }
}
