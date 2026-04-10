import type { FinanceiroAnalystMessage, FinanceiroAnalystResponse, ResumoFinanceiro } from "./types";

export const FINANCEIRO_ANALYST_INITIAL_PROMPTS = [
  "Qual o diagnóstico financeiro do mês atual?",
  "O fluxo de caixa está saudável ou em risco?",
  "Quais categorias de despesa estão mais pesando no resultado?",
  "Por que há diferença entre competência e receita de caixa?",
  "Como está a tendência do resultado nos últimos 6 meses?",
  "Qual a margem operacional e o que está pressionando?",
  "Há alguma conta bancária com saldo preocupante?",
  "Compare o resultado deste mês com os meses anteriores.",
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
  resumo?: ResumoFinanceiro | null
): string {
  const label = new Date(`${mes}-01T00:00:00Z`).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
  if (!resumo) return label;
  const resultado = resumo.caixa.resultadoLiquido;
  return `${label} • ${resultado >= 0 ? "resultado positivo" : "resultado negativo"}`;
}
