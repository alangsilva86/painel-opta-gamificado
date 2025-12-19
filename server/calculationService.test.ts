import { describe, expect, it } from "vitest";
import {
  aplicarAceleradorGlobal,
  calcularMetaGlobal,
  montarEscada,
  processarContratos,
  agregarPorVendedora,
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

  it("não soma comissão de vendedoras para Empréstimo Garantia Veículo", () => {
    const contratos = processarContratos([
      {
        ID: "ct_1",
        Numero_do_Contrato: "123",
        Data_de_Pagamento: "2024-05-10",
        Valor_liquido_liberado: 10000,
        Valor_comissao_opta: 500,
        Base_comissionavel_vendedores: 200,
        Vendedor: { display_value: "Ana", ID: "vend_1" },
        Produto: { display_value: "Empréstimo Garantia Veículo", ID: "prod_egv" },
        Corban: { display_value: "Agente X", ID: "corban_1" },
        Estagio: { display_value: "Financeiro", ID: "est_1" },
      },
    ]);

    const metas = new Map<string, number>([["vend_1", 10000]]);
    const [vendedora] = agregarPorVendedora(contratos, metas);

    expect(vendedora.baseComissionavelTotal).toBe(0);
    expect(vendedora.realizado).toBe(0);
    expect(vendedora.contratosSemComissao).toBe(0);
    expect(vendedora.contratos.length).toBe(0);
    expect(vendedora.comissaoBase).toBe(0);
  });

  it("não soma EGV no realizado global", () => {
    const contratos = processarContratos([
      {
        ID: "ct_1",
        Numero_do_Contrato: "123",
        Data_de_Pagamento: "2024-05-10",
        Valor_liquido_liberado: 10000,
        Valor_comissao_opta: 500,
        Base_comissionavel_vendedores: 200,
        Vendedor: { display_value: "Ana", ID: "vend_1" },
        Produto: { display_value: "Empréstimo Garantia Veículo - Ref.", ID: "prod_egv" },
        Corban: { display_value: "Agente X", ID: "corban_1" },
        Estagio: { display_value: "Financeiro", ID: "est_1" },
      },
      {
        ID: "ct_2",
        Numero_do_Contrato: "456",
        Data_de_Pagamento: "2024-05-11",
        Valor_liquido_liberado: 5000,
        Valor_comissao_opta: 300,
        Base_comissionavel_vendedores: 150,
        Vendedor: { display_value: "Bia", ID: "vend_2" },
        Produto: { display_value: "Consignado", ID: "prod_cons" },
        Corban: { display_value: "Agente Y", ID: "corban_2" },
        Estagio: { display_value: "Financeiro", ID: "est_1" },
      },
    ]);

    const metas = new Map<string, number>([
      ["vend_1", 10000],
      ["vend_2", 10000],
    ]);
    const vendedoras = agregarPorVendedora(contratos, metas);
    const metaGlobal = calcularMetaGlobal(vendedoras, 20000, 0, "2024-05");

    expect(metaGlobal.realizado).toBe(5000);
  });
});
