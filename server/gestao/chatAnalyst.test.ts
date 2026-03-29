import { describe, expect, it, vi } from "vitest";
import type { GestaoResumoSnapshot } from "./resumoSnapshot";
import {
  buildGestaoAnalystGrounding,
  CHAT_ANALYST_INPUT_SCHEMA,
  generateGestaoAnalystResponse,
} from "./chatAnalyst";
import { gestaoRouter } from "./gestaoRouter";

const { invokeLLMMock } = vi.hoisted(() => ({
  invokeLLMMock: vi.fn(),
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: invokeLLMMock,
}));

const input = CHAT_ANALYST_INPUT_SCHEMA.parse({
  question: "Por que estamos atrás da meta?",
  messages: [],
  viewState: {
    dateFrom: "2026-03-01",
    dateTo: "2026-03-31",
    comparisonMode: true,
    comparisonDateFrom: "2026-02-01",
    comparisonDateTo: "2026-02-28",
    filterState: {
      etapaPipeline: [],
      vendedorNome: [],
      produto: [],
      tipoOperacao: [],
    },
    flagFilters: {
      comissaoCalculada: false,
      liquidoFallback: false,
      inconsistenciaData: false,
      semComissao: false,
    },
    sortBy: "data",
    sortDir: "desc",
    incluirSemComissao: true,
    granularity: "day",
    seriesVisibility: {
      comissao: true,
      liquido: true,
      liquidoSem: true,
    },
    activeViewId: null,
  },
  availableViews: [
    {
      id: "preset-diretoria",
      name: "Diretoria",
      kind: "preset",
    },
  ],
});

const snapshot: GestaoResumoSnapshot = {
  cards: {
    contratos: 18,
    liquido: 220000,
    comissao: 11000,
    takeRate: 0.05,
    takeRateLimpo: 0.058,
    ticketMedio: 12222,
    pctComissaoCalculada: 0.09,
    contratosSemComissao: 3,
    metaComissao: 20000,
    paceComissao: 900,
    necessarioPorDia: 1500,
    diasDecorridos: 12,
    totalDias: 30,
  },
  timeseries: [
    {
      date: "2026-03-01",
      contratos: 5,
      contratosSemComissao: 1,
      liquido: 45000,
      comissao: 2200,
      liquidoComissionado: 39000,
      comissaoComissionado: 2200,
      takeRate: 0.048,
      takeRateLimpo: 0.056,
    },
  ],
  byStage: [
    {
      etapa: "Financeiro",
      count: 10,
      comissionadosCount: 8,
      semComissaoCount: 2,
      comissaoCalculadaCount: 1,
      liquidoFallbackCount: 0,
      inconsistenciaDataCount: 0,
      liquido: 120000,
      comissao: 6000,
      comissaoBase: 5000,
      comissaoBonus: 1000,
      comissaoVendedora: 198,
      liquidoComissionado: 110000,
      comissaoComissionado: 6000,
      ticketMedio: 12000,
      ticketMedioComissionado: 13750,
      takeRate: 0.05,
      takeRateLimpo: 0.054,
      pctComissaoCalculada: 0.1,
      pctLiquidoFallback: 0,
      pctInconsistenciaData: 0,
    },
  ],
  bySeller: [
    {
      vendedor: "Ana",
      count: 8,
      comissionadosCount: 7,
      semComissaoCount: 1,
      comissaoCalculadaCount: 1,
      liquidoFallbackCount: 0,
      inconsistenciaDataCount: 0,
      liquido: 100000,
      comissao: 6000,
      comissaoBase: 5500,
      comissaoBonus: 500,
      comissaoVendedora: 198,
      liquidoComissionado: 92000,
      comissaoComissionado: 6000,
      ticketMedio: 12500,
      ticketMedioComissionado: 13142,
      takeRate: 0.06,
      takeRateLimpo: 0.065,
      pctComissaoCalculada: 0.125,
      pctLiquidoFallback: 0,
      pctInconsistenciaData: 0,
      meta: 150000,
      pctMeta: 0.66,
      pctTotal: 0.54,
    },
  ],
  byTyper: [],
  byProduct: [
    {
      produto: "CDC",
      count: 10,
      comissionadosCount: 9,
      semComissaoCount: 1,
      comissaoCalculadaCount: 1,
      liquidoFallbackCount: 0,
      inconsistenciaDataCount: 0,
      liquido: 120000,
      comissao: 7000,
      comissaoBase: 6300,
      comissaoBonus: 700,
      comissaoVendedora: 231,
      liquidoComissionado: 112000,
      comissaoComissionado: 7000,
      ticketMedio: 12000,
      ticketMedioComissionado: 12444,
      takeRate: 0.058,
      takeRateLimpo: 0.062,
      pctComissaoCalculada: 0.1,
      pctLiquidoFallback: 0,
      pctInconsistenciaData: 0,
    },
  ],
  byProductOperation: [
    {
      produto: "CDC",
      operations: [
        {
          tipoOperacao: "Portabilidade",
          count: 10,
          comissionadosCount: 9,
          semComissaoCount: 1,
          comissaoCalculadaCount: 1,
          liquidoFallbackCount: 0,
          inconsistenciaDataCount: 0,
          liquido: 120000,
          comissao: 7000,
          comissaoBase: 6300,
          comissaoBonus: 700,
          comissaoVendedora: 231,
          liquidoComissionado: 112000,
          comissaoComissionado: 7000,
          ticketMedio: 12000,
          ticketMedioComissionado: 12444,
          takeRate: 0.058,
          takeRateLimpo: 0.062,
          pctComissaoCalculada: 0.1,
          pctLiquidoFallback: 0,
          pctInconsistenciaData: 0,
        },
      ],
    },
  ],
  byOperationType: [
    {
      tipoOperacao: "Portabilidade",
      count: 10,
      comissionadosCount: 9,
      semComissaoCount: 1,
      comissaoCalculadaCount: 1,
      liquidoFallbackCount: 0,
      inconsistenciaDataCount: 0,
      liquido: 120000,
      comissao: 7000,
      comissaoBase: 6300,
      comissaoBonus: 700,
      comissaoVendedora: 231,
      liquidoComissionado: 112000,
      comissaoComissionado: 7000,
      ticketMedio: 12000,
      ticketMedioComissionado: 12444,
      takeRate: 0.058,
      takeRateLimpo: 0.062,
      pctComissaoCalculada: 0.1,
      pctLiquidoFallback: 0,
      pctInconsistenciaData: 0,
    },
  ],
  alerts: [],
  executiveMetrics: [],
  executiveNarrative: [],
  watchlist: [],
  freshness: {
    lastSyncAt: "2026-03-28T10:00:00.000Z",
    status: "fresh",
    label: "Atualizado agora",
    detail: "Carga recente.",
  },
  dataQuality: {
    score: 88,
    status: "good",
    label: "Dados confiáveis",
    pctLiquidoFallback: 0.03,
    pctComissaoCalculada: 0.09,
    pctSemComissao: 0.16,
    totalRegistros: 18,
    detail: "Qualidade sob controle.",
  },
  businessStatus: {
    status: "warning",
    headline: "Risco moderado",
    summary: "Pace abaixo do necessário.",
    actionHint: "Investigar take rate e concentração.",
  },
};

describe("gestao chatAnalyst", () => {
  it("bloqueia acesso sem cookie de gestão", async () => {
    const caller = gestaoRouter.createCaller({
      req: { headers: {} } as any,
      res: {} as any,
      user: null,
    });

    await expect(caller.chatAnalyst(input)).rejects.toThrow(
      "Acesso Gestão não autorizado"
    );
  });

  it("inclui contexto de comparação no grounding", () => {
    const grounding = buildGestaoAnalystGrounding({
      input,
      snapshot,
      comparisonSnapshot: snapshot,
    });

    expect(grounding.context.comparacao).toEqual({
      enabled: true,
      dateFrom: "2026-02-01",
      dateTo: "2026-02-28",
    });
    expect(grounding.contextLabel).toContain("Comparação 2026-02-01 a 2026-02-28");
  });

  it("sanitiza ações e retorna resposta estruturada válida", async () => {
    invokeLLMMock.mockResolvedValueOnce({
      id: "resp_1",
      created: Date.now(),
      model: "test-model",
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content:
              "Aqui está o diagnóstico em JSON:\n```json\n" +
              JSON.stringify({
                answer:
                  "Estamos abaixo da meta por take rate e baixa concentração produtiva.",
                evidence: [
                  "Comissão atual em R$ 11.000,00",
                  "Necessário por dia em R$ 1.500,00",
                ],
                riskLevel: "high",
                recommendedActions: [
                  {
                    type: "apply_filter",
                    key: "produto",
                    values: ["CDC", "Inexistente"],
                    label: "",
                  },
                  {
                    type: "apply_saved_view",
                    viewId: "preset-diretoria",
                    label: "",
                  },
                  {
                    type: "apply_saved_view",
                    viewId: "nao-existe",
                    label: "Ignorar",
                  },
                ],
                followUpPrompts: [
                  "Quem mais pressiona o gap?",
                  "Como está o pipeline?",
                  "Vale ver por operação?",
                  "Pergunta extra",
                ],
                contextLabel: "",
              }) +
              "\n```",
          },
        },
      ],
    });

    const response = await generateGestaoAnalystResponse({
      input,
      snapshot,
      comparisonSnapshot: snapshot,
    });

    expect(response.riskLevel).toBe("high");
    expect(response.recommendedActions).toEqual([
      {
        type: "apply_filter",
        key: "produto",
        values: ["CDC"],
        label: "Filtrar produto",
      },
      {
        type: "apply_saved_view",
        viewId: "preset-diretoria",
        label: "Diretoria",
      },
    ]);
    expect(response.followUpPrompts).toHaveLength(3);
    expect(response.contextLabel).toContain("Período 2026-03-01 a 2026-03-31");
  });
});
