import { describe, expect, it } from "vitest";
import {
  aplicarAceleradorGlobal,
  calcularMetaGlobal,
  montarEscada,
  VendedoraStats,
} from "./calculationService";

function criarVendedora(parciais: Partial<VendedoraStats>): VendedoraStats {
  return {
    id: "vend_001",
    nome: "Teste",
    realizado: 0,
    meta: 1000,
    percentualMeta: 0,
    tier: "Bronze",
    tierNumero: 0,
    multiplicador: 0,
    comissaoBase: 0,
    comissaoPrevista: 0,
    contratos: [],
    badges: [],
    streak: 0,
    ...parciais,
  };
}

describe("calculationService", () => {
  it("não aplica acelerador para quem está abaixo de 75%", () => {
    const bronze = criarVendedora({
      realizado: 400,
      meta: 1000,
      percentualMeta: 40,
      multiplicador: 0,
      tier: "Bronze",
      comissaoBase: 0,
    });

    const [resultado] = aplicarAceleradorGlobal([bronze], 0.5);
    expect(resultado.comissaoPrevista).toBe(0);
  });

  it("aplica acelerador corretamente para quem está em tier elegível", () => {
    const prata = criarVendedora({
      realizado: 800,
      meta: 1000,
      percentualMeta: 80,
      multiplicador: 0.5,
      tier: "Prata",
      comissaoBase: 400, // 800 * 0.5
    });

    const [resultado] = aplicarAceleradorGlobal([prata], 0.25);
    expect(resultado.comissaoPrevista).toBeCloseTo(500); // 400 * 1.25
  });

  it("super meta aplica +50% (não cumulativo com meta 25%)", () => {
    const vendedoras = [
      criarVendedora({
        realizado: 700,
        meta: 1000,
        percentualMeta: 70,
      }),
      criarVendedora({
        id: "vend_002",
        nome: "Teste 2",
        realizado: 600,
        meta: 1000,
        percentualMeta: 60,
      }),
    ];

    const metaGlobal = calcularMetaGlobal(vendedoras, 1000, 1200, "2024-05");
    expect(metaGlobal.metaGlobalBatida).toBe(true);
    expect(metaGlobal.superMetaGlobalBatida).toBe(true);
    expect(metaGlobal.acelerador).toBeCloseTo(0.5);
  });

  it("montarEscada calcula alvos e faltas por nível", () => {
    const escada = montarEscada(1000, 500);
    const nivel75 = escada.find((s) => s.percentual === 75);
    expect(nivel75?.alvo).toBeCloseTo(750);
    expect(nivel75?.falta).toBeCloseTo(250);

    const nivel100 = escada.find((s) => s.percentual === 100);
    expect(nivel100?.atingido).toBe(false);
  });
});
