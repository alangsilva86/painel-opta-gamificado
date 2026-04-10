import { z } from "zod";
import { invokeLLM, type Message } from "../_core/llm";
import type { ResumoFinanceiro, SerieHistoricaItem } from "../procfy/resumoFinanceiro";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const CHAT_ROLE_SCHEMA = z.enum(["user", "assistant", "system"]);

const RAW_FINANCEIRO_ACTION_SCHEMA = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("change_month"),
    label: z.string().optional().default("Ver mês"),
    mes: z.string().regex(/^\d{4}-\d{2}$/),
  }),
]);

const RAW_FINANCEIRO_RESPONSE_SCHEMA = z.object({
  answer: z.string().min(1),
  summary: z.string().max(120).optional().default(""),
  evidence: z.array(z.string()).max(5).default([]),
  riskLevel: z.enum(["low", "medium", "high"]).default("medium"),
  recommendedActions: z.array(RAW_FINANCEIRO_ACTION_SCHEMA).max(3).default([]),
  followUpPrompts: z.array(z.string()).max(6).default([]),
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
  mes: z.string().regex(/^\d{4}-\d{2}$/),
});

export type FinanceiroAnalystInput = z.infer<typeof FINANCEIRO_CHAT_ANALYST_INPUT_SCHEMA>;
export type FinanceiroAnalystAction = z.infer<typeof RAW_FINANCEIRO_ACTION_SCHEMA>;
export type FinanceiroAnalystResponse = z.infer<typeof RAW_FINANCEIRO_RESPONSE_SCHEMA>;

type LooseFinanceiroAnalystResponse = {
  answer?: unknown;
  summary?: unknown;
  evidence?: unknown;
  riskLevel?: unknown;
  recommendedActions?: unknown;
  followUpPrompts?: unknown;
  contextLabel?: unknown;
};

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Context label
// ---------------------------------------------------------------------------

function buildContextLabel(mes: string, resumo: ResumoFinanceiro) {
  const label = formatMonthLabel(mes);
  const resultado = resumo.caixa.resultadoLiquido;
  const status = resultado >= 0 ? "resultado positivo" : "resultado negativo";
  return `${label} • ${status}`;
}

// ---------------------------------------------------------------------------
// Analyst signals (pre-computed)
// ---------------------------------------------------------------------------

function buildAnalystSignals(resumo: ResumoFinanceiro, serie: SerieHistoricaItem[]) {
  const totalReceitas = resumo.caixa.totalReceitas;
  const resultadoLiquido = resumo.caixa.resultadoLiquido;

  const margemOperacional = totalReceitas > 0 ? resultadoLiquido / totalReceitas : 0;
  const margemStatus =
    margemOperacional > 0.25 ? "saudável" : margemOperacional > 0.1 ? "apertada" : "crítica";

  // Trend from last 3 months of the series (already divided by 100 at grounding)
  const ultimos3 = serie.slice(-3).map(item => item.resultado);
  let tendencia: "melhora_consistente" | "deterioracao_consistente" | "volatil" | "insuficiente" =
    "insuficiente";
  if (ultimos3.length >= 3) {
    const melhora = ultimos3[2] > ultimos3[1] && ultimos3[1] > ultimos3[0];
    const piora = ultimos3[2] < ultimos3[1] && ultimos3[1] < ultimos3[0];
    tendencia = melhora ? "melhora_consistente" : piora ? "deterioracao_consistente" : "volatil";
  }

  // Consecutive negative months (counting backwards)
  let mesesConsecutivosNegativo = 0;
  for (let i = serie.length - 1; i >= 0; i--) {
    if (serie[i].resultado < 0) {
      mesesConsecutivosNegativo++;
    } else {
      break;
    }
  }

  const caixaNegativo = resumo.caixa.saldosContas.some(c => c.saldo < 0);
  const resultadoNegativo = resultadoLiquido < 0;

  // Dominant expense category
  const topExpense = resumo.caixa.porCategoria
    .filter(c => c.tipo !== "revenue")
    .sort((a, b) => b.valor - a.valor)[0] ?? null;

  return {
    margemStatus,
    margemOperacional: formatPercent(margemOperacional),
    tendencia,
    mesesConsecutivosNegativo,
    caixaNegativo,
    resultadoNegativo,
    topExpense: topExpense
      ? {
          categoria: topExpense.categoria,
          pct: formatPercent(topExpense.pct),
          riscoAlto: topExpense.pct > 0.4,
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Grounding
// ---------------------------------------------------------------------------

export function buildFinanceiroAnalystGrounding(
  mes: string,
  resumo: ResumoFinanceiro,
  serie: SerieHistoricaItem[]
) {
  const contextLabel = buildContextLabel(mes, resumo);
  const analystSignals = buildAnalystSignals(resumo, serie);

  const totalReceitas = resumo.caixa.totalReceitas;
  const resultadoLiquido = resumo.caixa.resultadoLiquido;
  const margemOperacional = totalReceitas > 0 ? resultadoLiquido / totalReceitas : 0;
  const totalCaixa = resumo.caixa.saldosContas.reduce((acc, c) => acc + c.saldo, 0);

  return {
    contextLabel,
    periodo: {
      mes,
      label: formatMonthLabel(mes),
    },
    kpisCaixa: {
      totalReceitas: formatCurrency(resumo.caixa.totalReceitas),
      totalDespesas: formatCurrency(resumo.caixa.totalDespesas),
      totalFolha: formatCurrency(resumo.caixa.totalFolha),
      totalImpostos: formatCurrency(resumo.caixa.totalImpostos),
      resultadoLiquido: formatCurrency(resultadoLiquido),
      resultadoPositivo: resultadoLiquido >= 0,
      margemOperacional: formatPercent(margemOperacional),
      totalCaixa: formatCurrency(totalCaixa),
    },
    competencia: {
      comissaoOpta: formatCurrency(resumo.competencia.comissaoOpta),
      receitaBruta: formatCurrency(resumo.competencia.receitaBruta),
      quantidadeContratos: resumo.competencia.quantidadeContratos,
      topProdutos: resumo.competencia.porProduto.slice(0, 5).map(p => ({
        produto: p.produto,
        valor: formatCurrency(p.valor),
        pct: formatPercent(p.pct),
      })),
      topVendedores: resumo.competencia.porVendedor.slice(0, 5).map(v => ({
        vendedor: v.vendedor,
        valor: formatCurrency(v.valor),
        pct: formatPercent(v.pct),
      })),
    },
    gapAnalysis: {
      comissaoOpta: formatCurrency(resumo.competencia.comissaoOpta),
      receitaCaixa: formatCurrency(resumo.caixa.totalReceitas),
      gap: formatCurrency(resumo.comparativo.gap),
      gapPositivo: resumo.comparativo.gap >= 0,
      ratioComissaoVsCaixa: formatPercent(resumo.comparativo.comissaoVsReceitaCaixa),
      interpretacao:
        resumo.comparativo.gap > 0
          ? "Caixa superior à competência — entrada antecipada de receitas ou contratos de meses anteriores liquidados"
          : resumo.comparativo.gap < 0
            ? "Competência superior ao caixa — receitas reconhecidas ainda não recebidas em caixa"
            : "Competência e caixa equilibrados",
    },
    topDespesas: resumo.caixa.porCategoria
      .filter(c => c.tipo !== "revenue")
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8)
      .map(c => ({
        categoria: c.categoria,
        tipo: c.tipo,
        valor: formatCurrency(c.valor),
        pct: formatPercent(c.pct),
      })),
    saldosContas: resumo.caixa.saldosContas.map(c => ({
      conta: c.conta,
      saldo: formatCurrency(c.saldo),
      negativo: c.saldo < 0,
    })),
    // NOTE: serie values are in cents — dividing by 100 to match the chart's own treatment
    serieHistorica: serie.map(item => ({
      mes: item.mes,
      label: formatMonthLabel(item.mes),
      competencia: formatCurrency(item.competencia / 100),
      receitas: formatCurrency(item.receitas / 100),
      despesas: formatCurrency(item.despesas / 100),
      resultado: formatCurrency(item.resultado / 100),
      resultadoPositivo: item.resultado >= 0,
    })),
    analystSignals,
  };
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt() {
  return `# Identidade e Missão
Você é um analista financeiro sênior de nível CFO especializado em gestão financeira de correspondentes bancários e empresas de crédito. Responde exclusivamente em PT-BR. Sua função é transformar dados de fluxo de caixa, DRE e competência em diagnósticos financeiros acionáveis para o gestor responsável.

# Fronteira de Conhecimento
- Você SOMENTE analisa dados presentes no GROUNDING ESTRUTURADO fornecido no contexto.
- Jamais invente valores, datas ou categorias. Se um dado não está no grounding, diga "não disponível para este período".
- Nunca especule sobre meses fora do grounding.

# Metodologia de Análise (siga nesta ordem)
1. ORIENT — Identifique o período analisado e os dados presentes (caixa, competência, série histórica).
2. DIAGNOSE — Examine os sinais pré-computados (analystSignals), o resultado líquido, a margem operacional e o gap competência/caixa. Priorize resultados negativos, margens comprimidas e deteriorações de tendência antes de pontos positivos.
3. EXPLAIN — Conecte o número bruto ao porquê: concentração de despesas, sazonalidade visível na série, descolamento entre competência e caixa, contas com saldo negativo.
4. RECOMMEND — Sugira ações concretas quando relevante (ex: examinar mês anterior, investigar categoria específica). Máximo 3 ações.

# Critérios de Qualidade da Evidência
- evidence: cite valores formatados do grounding (ex: "Despesas fixas: R$ 28.400 = 38% do total de despesas"). Máximo 5 itens. Cada item deve conter dado + contexto.
- Não repita no evidence o que já está no answer.
- Se analystSignals.caixaNegativo ou resultadoNegativo forem true, inclua como evidência de risco prioritária.

# Avaliação de Risco
- riskLevel "high": resultado negativo, margem < 5%, 2+ meses consecutivos negativos, ou conta bancária com saldo negativo.
- riskLevel "medium": margem entre 5–15%, deterioração consistente na série, ou gap caixa/competência relevante.
- riskLevel "low": margem > 15%, resultado positivo, tendência de melhora ou estável.

# Perguntas de Follow-up
- followUpPrompts: 3–6 perguntas que aprofundam o diagnóstico ou abrem investigações relevantes.
- Formule como o gestor perguntaria, não como analista.

# Formato de Resposta (JSON estrito)
{
  "answer": "Resposta executiva principal. 2–4 parágrafos curtos. Tom direto. Sem listas — use frases. Comece pelo diagnóstico mais crítico.",
  "summary": "1 frase resumindo o status financeiro do período em até 14 palavras.",
  "evidence": ["Dado formatado 1 com contexto", "..."],
  "riskLevel": "low | medium | high",
  "recommendedActions": [{ "type": "change_month", "label": "Label descritivo", "mes": "YYYY-MM" }],
  "followUpPrompts": ["Pergunta 1?", "Pergunta 2?", "Pergunta 3?"],
  "contextLabel": "Descrição curta do período analisado"
}`;
}

// ---------------------------------------------------------------------------
// Conversation history
// ---------------------------------------------------------------------------

function buildConversationHistory(messages: FinanceiroAnalystInput["messages"]) {
  return messages
    .filter(m => m.role !== "system")
    .slice(-8)
    .map<Message>(message => ({
      role: message.role,
      content: message.content,
    }));
}

// ---------------------------------------------------------------------------
// No-data fallback
// ---------------------------------------------------------------------------

function buildNoDataResponse(mes: string): FinanceiroAnalystResponse {
  const label = formatMonthLabel(mes);
  return {
    answer:
      `Não há dados financeiros para ${label}. Sincronize a base do Procfy para este período ` +
      "antes de solicitar análises. Use o botão \"Sincronizar Procfy\" no topo da página.",
    summary: "Sem dados para o período — sincronização necessária.",
    evidence: [`Mês analisado: ${label}`, "Nenhuma transação encontrada no banco de dados."],
    riskLevel: "medium",
    recommendedActions: [],
    followUpPrompts: [
      "Qual período tem dados disponíveis?",
      "Como faço a sincronização do Procfy?",
    ],
    contextLabel: `${label} • sem dados`,
  };
}

// ---------------------------------------------------------------------------
// Response normalization helpers
// ---------------------------------------------------------------------------

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
  resultadoNegativo: boolean
): "low" | "medium" | "high" {
  if (typeof value === "string") {
    const n = value.trim().toLowerCase();
    if (n === "low" || n === "baixo") return "low";
    if (n === "medium" || n === "medio" || n === "médio" || n === "moderado") return "medium";
    if (n === "high" || n === "alto" || n === "critical" || n === "critico" || n === "crítico") return "high";
  }
  return resultadoNegativo ? "high" : "medium";
}

function normalizeLooseActions(value: unknown): FinanceiroAnalystAction[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      if (typeof record.type === "string" && record.type.includes("change_month")) {
        const mes = toCleanString(record.mes);
        if (/^\d{4}-\d{2}$/.test(mes)) {
          return {
            type: "change_month" as const,
            label: toCleanString(record.label) || "Ver mês",
            mes,
          };
        }
      }
      return null;
    })
    .filter(Boolean) as FinanceiroAnalystAction[];
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

// ---------------------------------------------------------------------------
// Sanitize
// ---------------------------------------------------------------------------

function sanitizeFinanceiroAnalystResponse(
  response: FinanceiroAnalystResponse
): FinanceiroAnalystResponse {
  const recommendedActions = response.recommendedActions
    .map(action => {
      if (action.type === "change_month") {
        if (!/^\d{4}-\d{2}$/.test(action.mes)) return null;
        return {
          ...action,
          label: action.label.trim() || "Ver mês",
        };
      }
      return null;
    })
    .filter(Boolean) as FinanceiroAnalystAction[];

  return {
    answer: response.answer.trim(),
    summary: (response.summary ?? "").trim(),
    evidence: response.evidence
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 5),
    riskLevel: response.riskLevel,
    recommendedActions,
    followUpPrompts: response.followUpPrompts
      .map(p => p.trim())
      .filter(Boolean)
      .slice(0, 6),
    contextLabel: (response.contextLabel ?? "").trim(),
  };
}

// ---------------------------------------------------------------------------
// Fallback response
// ---------------------------------------------------------------------------

function buildFallbackAnalystResponse(
  rawContent: string,
  contextLabel: string,
  resumo: ResumoFinanceiro
): FinanceiroAnalystResponse {
  const cleaned = unwrapJsonCodeFence(rawContent).trim();
  return {
    answer:
      cleaned.length > 0
        ? cleaned
        : `Analisei o período ${contextLabel}, mas o modelo respondeu fora do formato esperado nesta tentativa.`,
    summary: resumo.caixa.resultadoLiquido >= 0 ? "Resultado positivo no período." : "Resultado negativo no período.",
    evidence: [
      `Resultado líquido: ${formatCurrency(resumo.caixa.resultadoLiquido)}`,
      `Receita caixa: ${formatCurrency(resumo.caixa.totalReceitas)}`,
      `Despesas totais: ${formatCurrency(resumo.caixa.totalDespesas)}`,
    ],
    riskLevel: resumo.caixa.resultadoLiquido < 0 ? "high" : "medium",
    recommendedActions: [],
    followUpPrompts: [],
    contextLabel,
  };
}

// ---------------------------------------------------------------------------
// Normalize loose response
// ---------------------------------------------------------------------------

function normalizeLooseResponse(
  value: unknown,
  contextLabel: string,
  resultadoNegativo: boolean
): FinanceiroAnalystResponse | null {
  if (!value || typeof value !== "object") return null;
  const loose = value as LooseFinanceiroAnalystResponse;
  const answer = toCleanString(loose.answer);
  if (!answer) return null;

  return {
    answer,
    summary: toCleanString(loose.summary),
    evidence: toStringArray(loose.evidence).slice(0, 5),
    riskLevel: normalizeRiskLevel(loose.riskLevel, resultadoNegativo),
    recommendedActions: normalizeLooseActions(loose.recommendedActions),
    followUpPrompts: toStringArray(loose.followUpPrompts).slice(0, 6),
    contextLabel: toCleanString(loose.contextLabel) || contextLabel,
  };
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

export async function generateFinanceiroAnalystResponse(params: {
  input: FinanceiroAnalystInput;
  resumo: ResumoFinanceiro;
  serie: SerieHistoricaItem[];
}): Promise<FinanceiroAnalystResponse> {
  const { input, resumo, serie } = params;

  // No-data guard
  if (
    resumo.competencia.quantidadeContratos === 0 &&
    resumo.caixa.totalReceitas === 0 &&
    resumo.caixa.totalDespesas === 0
  ) {
    return buildNoDataResponse(input.mes);
  }

  const grounding = buildFinanceiroAnalystGrounding(input.mes, resumo, serie);
  const resultadoNegativo = resumo.caixa.resultadoLiquido < 0;

  const llmResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(),
      },
      // Stable seed turn with structured grounding
      {
        role: "user",
        content:
          "## GROUNDING ESTRUTURADO DO PERÍODO FINANCEIRO\n\n" +
          "Este é o contexto de dados para toda a conversa. Baseie suas respostas exclusivamente neste grounding. Responda sempre em JSON.\n\n" +
          JSON.stringify(grounding, null, 2),
      },
      {
        role: "assistant",
        content:
          `Grounding recebido. Período: ${grounding.contextLabel}. ` +
          `Resultado: ${grounding.kpisCaixa.resultadoLiquido}. ` +
          `Margem operacional: ${grounding.analystSignals.margemOperacional}. ` +
          `Tendência: ${grounding.analystSignals.tendencia}. ` +
          (grounding.analystSignals.resultadoNegativo ? "ALERTA: resultado negativo. " : "") +
          (grounding.analystSignals.caixaNegativo ? "ALERTA: conta com saldo negativo. " : "") +
          "Pronto para analisar.",
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

  let parsed: FinanceiroAnalystResponse;
  try {
    const parsedJson = JSON.parse(extractJsonObjectCandidate(rawContent));
    try {
      parsed = RAW_FINANCEIRO_RESPONSE_SCHEMA.parse(parsedJson);
    } catch {
      const normalized = normalizeLooseResponse(
        parsedJson,
        grounding.contextLabel,
        resultadoNegativo
      );
      if (!normalized) {
        throw new Error("LLM response schema mismatch: normalized answer empty");
      }

      const sanitized = sanitizeFinanceiroAnalystResponse(normalized);
      return {
        ...sanitized,
        contextLabel: sanitized.contextLabel || grounding.contextLabel,
      };
    }
  } catch (parseError) {
    const isJson = parseError instanceof SyntaxError;
    if (isJson) {
      return buildFallbackAnalystResponse(rawContent, grounding.contextLabel, resumo);
    }

    if (
      parseError instanceof Error &&
      parseError.message.includes("LLM response schema mismatch")
    ) {
      return buildFallbackAnalystResponse(rawContent, grounding.contextLabel, resumo);
    }

    throw new Error(
      `LLM response schema mismatch: ${parseError instanceof Error ? parseError.message : String(parseError)}`
    );
  }

  const sanitized = sanitizeFinanceiroAnalystResponse(parsed);
  return {
    ...sanitized,
    contextLabel: sanitized.contextLabel || grounding.contextLabel,
  };
}
