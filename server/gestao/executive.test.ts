import { describe, expect, it } from "vitest";
import { buildExecutiveLayer } from "./executive";

describe("buildExecutiveLayer", () => {
  it("gera métricas executivas semânticas e watchlist crítica quando o pace está atrás", () => {
    const layer = buildExecutiveLayer({
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
          contratos: 3,
          contratosSemComissao: 1,
          liquido: 40000,
          comissao: 2500,
          takeRate: 0.0625,
          takeRateLimpo: 0.0625,
        },
        {
          date: "2026-03-02",
          contratos: 4,
          contratosSemComissao: 0,
          liquido: 38000,
          comissao: 2200,
          takeRate: 0.0578,
          takeRateLimpo: 0.0578,
        },
        {
          date: "2026-03-03",
          contratos: 5,
          contratosSemComissao: 1,
          liquido: 52000,
          comissao: 2100,
          takeRate: 0.0403,
          takeRateLimpo: 0.048,
        },
        {
          date: "2026-03-04",
          contratos: 6,
          contratosSemComissao: 1,
          liquido: 90000,
          comissao: 4200,
          takeRate: 0.0467,
          takeRateLimpo: 0.053,
        },
      ],
      byStage: [
        {
          etapa: "Financeiro",
          count: 10,
          semComissaoCount: 2,
          comissao: 6000,
          liquido: 120000,
          takeRate: 0.05,
        },
        {
          etapa: "Formalização",
          count: 8,
          semComissaoCount: 1,
          comissao: 5000,
          liquido: 100000,
          takeRate: 0.05,
        },
      ],
      bySeller: [
        {
          vendedor: "Ana",
          count: 8,
          semComissaoCount: 0,
          comissao: 6000,
          liquido: 100000,
          pctMeta: 0.9,
          pctTotal: 0.55,
          takeRate: 0.06,
        },
        {
          vendedor: "Bia",
          count: 6,
          semComissaoCount: 2,
          comissao: 3200,
          liquido: 70000,
          pctMeta: 0.7,
          pctTotal: 0.29,
          takeRate: 0.045,
        },
        {
          vendedor: "Carol",
          count: 4,
          semComissaoCount: 1,
          comissao: 1800,
          liquido: 50000,
          pctMeta: 0.4,
          pctTotal: 0.16,
          takeRate: 0.036,
        },
      ],
      byProduct: [
        {
          produto: "CDC",
          count: 10,
          semComissaoCount: 1,
          comissao: 4000,
          liquido: 120000,
          takeRate: 0.033,
        },
        {
          produto: "FGTS",
          count: 8,
          semComissaoCount: 2,
          comissao: 7000,
          liquido: 100000,
          takeRate: 0.07,
        },
      ],
      byOperationType: [
        {
          tipoOperacao: "Portabilidade",
          count: 12,
          semComissaoCount: 2,
          comissao: 4500,
          liquido: 130000,
          takeRate: 0.0346,
        },
        {
          tipoOperacao: "Refin",
          count: 6,
          semComissaoCount: 1,
          comissao: 6500,
          liquido: 90000,
          takeRate: 0.0722,
        },
      ],
      alerts: [],
      latestSyncAt: new Date(),
      quality: {
        pctLiquidoFallback: 0.04,
        pctComissaoCalculada: 0.09,
        pctSemComissao: 3 / 18,
        totalRegistros: 18,
      },
    });

    expect(layer.executiveMetrics).toHaveLength(6);
    expect(
      layer.executiveMetrics.find(metric => metric.id === "paceVsMeta")?.status
    ).toBe("critical");
    expect(layer.businessStatus.status).toBe("critical");
    expect(layer.freshness.status).toBe("fresh");
    expect(layer.watchlist.some(item => item.id === "pace-behind")).toBe(true);
    expect(
      layer.executiveNarrative.some(item => item.id === "quality-sem-comissao")
    ).toBe(true);
  });
});
