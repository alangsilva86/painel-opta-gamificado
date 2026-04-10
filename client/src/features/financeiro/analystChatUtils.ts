import type {
  FinanceiroAnalystFocus,
  FinanceiroAnalystMessage,
  FinanceiroAnalystResponse,
  ResumoFinanceiro,
} from "./types";

export const FINANCEIRO_ANALYST_INITIAL_PROMPTS = [
  "Qual decisão financeira mais urgente deste mês?",
  "O que piorou versus o mês anterior?",
  "Como chegamos no total de custos deste mês?",
  "Quais gastos com pessoas estão mais pressionando o resultado?",
  "Existe alguma conta bancária em risco imediato?",
  "Se eu tiver 7 dias para agir, por onde começo?",
];

export function createFinanceiroAnalystMessage(
  role: FinanceiroAnalystMessage["role"],
  content: string,
  response?: FinanceiroAnalystResponse
): FinanceiroAnalystMessage {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `analyst_${Math.random().toString(36).slice(2, 10)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    response,
  };
}

export function buildFinanceiroAnalystContextLabel(
  mes: string,
  resumo?: ResumoFinanceiro | null,
  compareTo?: string | null,
  focus: FinanceiroAnalystFocus = "overview"
): string {
  const label = new Date(`${mes}-01T00:00:00Z`).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
  if (!resumo) return label;
  const resultado = resumo.caixa.resultadoLiquido;
  const compareLabel = compareTo
    ? ` • vs ${new Date(`${compareTo}-01T00:00:00Z`).toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      })}`
    : "";
  const focusLabel = focus === "overview" ? "" : ` • foco ${focus}`;
  return `${label} • ${resultado >= 0 ? "resultado positivo" : "resultado negativo"}${compareLabel}${focusLabel}`;
}

export function buildFinanceiroAnalystContextSignature(
  mes: string,
  compareTo?: string | null,
  focus: FinanceiroAnalystFocus = "overview"
) {
  return JSON.stringify({
    mes,
    compareTo: compareTo || null,
    focus,
  });
}
