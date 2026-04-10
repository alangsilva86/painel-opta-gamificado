import { describe, expect, it, vi } from "vitest";
import type {
  FinanceiroInvestigationPack,
  ResumoFinanceiro,
  SerieHistoricaItem,
} from "../procfy/resumoFinanceiro";
import {
  buildFinanceiroExecutiveDefaults,
  FINANCEIRO_CHAT_ANALYST_INPUT_SCHEMA,
  generateFinanceiroAnalystResponse,
  resolveFinanceiroAnalystContext,
} from "./chatAnalyst";

const { invokeLLMMock } = vi.hoisted(() => ({
  invokeLLMMock: vi.fn(),
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: invokeLLMMock,
}));

const resumoMarco: ResumoFinanceiro = {
  competencia: {
    mes: "2026-03",
    receitaBruta: 200_000,
    comissaoOpta: 46_100.15,
    quantidadeContratos: 12,
    porProduto: [
      { produto: "Crédito Consignado", valor: 42_300, pct: 0.9176 },
      { produto: "FGTS", valor: 3_800.15, pct: 0.0824 },
    ],
    porVendedor: [
      { vendedor: "Nathalia", valor: 28_700, pct: 0.6225 },
      { vendedor: "Risieli", valor: 10_000, pct: 0.2169 },
      { vendedor: "Francieli", valor: 7_400.15, pct: 0.1606 },
    ],
  },
  caixa: {
    totalReceitas: 55_371.58,
    totalDespesas: 18_237.78,
    totalFolha: 10_683.97,
    totalImpostos: 4_950,
    resultadoLiquido: 1_499.83,
    porCategoria: [
      { categoria: "Honorário Contábil", tipo: "fixed_expense", valor: 6_000, pct: 0.329 },
      { categoria: "Marketing", tipo: "variable_expense", valor: 4_500, pct: 0.247 },
      { categoria: "Salários", tipo: "payroll", valor: 10_683.97, pct: 1 },
      { categoria: "Impostos", tipo: "tax", valor: 4_950, pct: 1 },
    ],
    saldosContas: [
      { conta: "Conta Principal", saldo: 12_400 },
      { conta: "Bradesco", saldo: 3_100 },
    ],
  },
  comparativo: {
    comissaoVsReceitaCaixa: 0.8326,
    gap: 9_271.43,
  },
};

const resumoFevereiro: ResumoFinanceiro = {
  competencia: {
    ...resumoMarco.competencia,
    mes: "2026-02",
    comissaoOpta: 39_800,
  },
  caixa: {
    ...resumoMarco.caixa,
    totalReceitas: 48_100,
    totalDespesas: 15_100,
    totalFolha: 9_980,
    totalImpostos: 4_500,
    resultadoLiquido: 8_520,
    saldosContas: [
      { conta: "Conta Principal", saldo: 16_000 },
      { conta: "Bradesco", saldo: 5_200 },
    ],
  },
  comparativo: {
    comissaoVsReceitaCaixa: 0.8274,
    gap: 8_300,
  },
};

const investigationMarco: FinanceiroInvestigationPack = {
  totalCosts: 33_871.75,
  typeBreakdown: [
    {
      tipo: "fixed_expense",
      label: "Despesas fixas",
      valor: 9_737.78,
      pctOfCosts: 0.2875,
      pctOfRevenue: 0.1759,
    },
    {
      tipo: "variable_expense",
      label: "Despesas variáveis",
      valor: 8_500,
      pctOfCosts: 0.2509,
      pctOfRevenue: 0.1535,
    },
    {
      tipo: "payroll",
      label: "Folha",
      valor: 10_683.97,
      pctOfCosts: 0.3154,
      pctOfRevenue: 0.1929,
    },
    {
      tipo: "tax",
      label: "Impostos",
      valor: 4_950,
      pctOfCosts: 0.1462,
      pctOfRevenue: 0.0894,
    },
  ],
  topExpenseCategories: [
    {
      categoria: "Salários",
      tipo: "payroll",
      valor: 10_683.97,
      pctOfCosts: 0.3154,
      pctWithinType: 1,
    },
    {
      categoria: "Honorário Contábil",
      tipo: "fixed_expense",
      valor: 6_000,
      pctOfCosts: 0.1771,
      pctWithinType: 0.616,
    },
    {
      categoria: "Marketing",
      tipo: "variable_expense",
      valor: 4_500,
      pctOfCosts: 0.1329,
      pctWithinType: 0.5294,
    },
    {
      categoria: "Impostos",
      tipo: "tax",
      valor: 4_950,
      pctOfCosts: 0.1462,
      pctWithinType: 1,
    },
  ],
  payrollBreakdown: [
    {
      categoria: "Salários",
      valor: 10_683.97,
      pctOfPayroll: 1,
    },
  ],
  categoryBridge: [
    {
      label: "Salários (Folha)",
      valor: 10_683.97,
      pctOfCosts: 0.3154,
    },
    {
      label: "Honorário Contábil (Despesas fixas)",
      valor: 6_000,
      pctOfCosts: 0.1771,
    },
    {
      label: "Marketing (Despesas variáveis)",
      valor: 4_500,
      pctOfCosts: 0.1329,
    },
    {
      label: "Impostos (Impostos)",
      valor: 4_950,
      pctOfCosts: 0.1462,
    },
    {
      label: "Outros custos",
      valor: 7_737.78,
      pctOfCosts: 0.2284,
    },
  ],
  topExpenseTransactions: [
    {
      id: "1",
      name: "Salários",
      tipo: "payroll",
      categoria: "Salários",
      conta: "Conta Principal",
      contato: "Equipe",
      valor: 10_683.97,
      pago: true,
      dataPagamento: "2026-03-08",
      dataCompetencia: "2026-03-08",
      metodoPagamento: "bank_transfer",
    },
    {
      id: "2",
      name: "Honorário Contábil",
      tipo: "fixed_expense",
      categoria: "Honorário Contábil",
      conta: "Conta Principal",
      contato: "Contabilidade",
      valor: 6_000,
      pago: true,
      dataPagamento: "2026-03-10",
      dataCompetencia: "2026-03-10",
      metodoPagamento: "pix",
    },
  ],
  topRevenueTransactions: [
    {
      id: "r1",
      name: "Recebimento contrato A",
      tipo: "revenue",
      categoria: "Receitas",
      conta: "Conta Principal",
      contato: "Banco A",
      valor: 22_000,
      pago: true,
      dataPagamento: "2026-03-05",
      dataCompetencia: "2026-03-05",
      metodoPagamento: "pix",
    },
  ],
  accountRisk: [
    { conta: "Conta Principal", saldo: 12_400, status: "healthy" },
    { conta: "Bradesco", saldo: 3_100, status: "low" },
  ],
  availableFilters: {
    categorias: ["Honorário Contábil", "Marketing", "Salários", "Impostos"],
    contas: ["Conta Principal", "Bradesco"],
  },
};

const investigationFevereiro: FinanceiroInvestigationPack = {
  ...investigationMarco,
  totalCosts: 29_580,
  topExpenseCategories: [
    {
      categoria: "Salários",
      tipo: "payroll",
      valor: 9_980,
      pctOfCosts: 0.3374,
      pctWithinType: 1,
    },
    {
      categoria: "Honorário Contábil",
      tipo: "fixed_expense",
      valor: 5_200,
      pctOfCosts: 0.1758,
      pctWithinType: 0.5829,
    },
  ],
  payrollBreakdown: [
    {
      categoria: "Salários",
      valor: 9_980,
      pctOfPayroll: 1,
    },
  ],
  accountRisk: [
    { conta: "Conta Principal", saldo: 16_000, status: "healthy" },
    { conta: "Bradesco", saldo: 5_200, status: "healthy" },
  ],
};

const serie: SerieHistoricaItem[] = [
  {
    mes: "2026-01",
    competencia: 3_980_000,
    receitas: 4_610_000,
    despesas: 2_840_000,
    resultado: 720_000,
  },
  {
    mes: "2026-02",
    competencia: 3_980_000,
    receitas: 4_810_000,
    despesas: 2_958_000,
    resultado: 852_000,
  },
  {
    mes: "2026-03",
    competencia: 4_610_015,
    receitas: 5_537_158,
    despesas: 3_387_175,
    resultado: 149_983,
  },
];

describe("financeiro chatAnalyst", () => {
  it("resolve explicit month mentions before calling the analyst", () => {
    const input = FINANCEIRO_CHAT_ANALYST_INPUT_SCHEMA.parse({
      question: "Analise março e compare com fevereiro",
      messages: [],
      mes: "2026-04",
    });

    const resolved = resolveFinanceiroAnalystContext(input);

    expect(resolved.requestedPeriod).toBe("2026-03");
    expect(resolved.resolvedPeriod).toBe("2026-03");
    expect(resolved.compareTo).toBe("2026-02");
    expect(resolved.boundaryChanged).toBe(true);
    expect(resolved.focus).toBe("comparison");
  });

  it("falls back to a deterministic executive response when the model returns plain text", async () => {
    invokeLLMMock.mockResolvedValueOnce({
      id: "1",
      created: Date.now(),
      model: "test-model",
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: "Março parece melhor, mas revise custos.",
          },
        },
      ],
    });

    const input = FINANCEIRO_CHAT_ANALYST_INPUT_SCHEMA.parse({
      question: "Analise março",
      messages: [
        {
          role: "user",
          content: "O fluxo de caixa de abril está saudável?",
        },
      ],
      mes: "2026-04",
    });
    const resolvedContext = resolveFinanceiroAnalystContext(input);

    const response = await generateFinanceiroAnalystResponse({
      input,
      resolvedContext,
      resumo: resumoMarco,
      serie,
      investigation: investigationMarco,
      comparisonResumo: null,
      comparisonInvestigation: null,
    });

    expect(response.resolvedPeriod).toBe("2026-03");
    expect(response.requestedPeriod).toBe("2026-03");
    expect(response.warnings.join(" ")).toContain("mês aberto na tela");
    expect(response.actions.some(action => action.type === "change_month")).toBe(
      true
    );
    expect(response.citations.length).toBeGreaterThanOrEqual(2);
    expect(response.headline).toContain("mar.");
  });

  it("builds a reconciliation-first executive fallback with reconciled cost totals", () => {
    const input = FINANCEIRO_CHAT_ANALYST_INPUT_SCHEMA.parse({
      question: "Como chegamos em 33k de custos?",
      messages: [],
      mes: "2026-03",
    });
    const resolvedContext = resolveFinanceiroAnalystContext(input);

    const response = buildFinanceiroExecutiveDefaults({
      input,
      resolvedContext,
      resumo: resumoMarco,
      serie,
      investigation: investigationMarco,
      comparisonResumo: resumoFevereiro,
      comparisonInvestigation: investigationFevereiro,
    });

    expect(response.headline).toContain("R$ 33.871,75");
    expect(response.decision.message).toContain("ponte de custos");
    expect(
      response.citations.some(
        item =>
          item.label === "Custos totais" &&
          item.value === "R$ 33.871,75"
      )
    ).toBe(true);
    expect(response.actions.some(action => action.type === "open_category")).toBe(
      true
    );
    expect(response.followUpPrompts[0]).toContain("categorias");
  });
});
