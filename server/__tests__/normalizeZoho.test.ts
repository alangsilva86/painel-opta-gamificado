import { describe, expect, it } from "vitest";
import { normalizeContratoZoho, parseMoneyToCents, parsePercent } from "../gestao/normalizeZoho";
import { ZohoContratoRaw } from "../zohoService";

describe("parse helpers", () => {
  it("parseMoneyToCents should handle locale formats", () => {
    expect(parseMoneyToCents("1.234,56")).toBe(123456);
    expect(parseMoneyToCents("1234.56")).toBe(123456);
    expect(parseMoneyToCents("R$ 0,00")).toBe(0);
  });

  it("parsePercent should normalize to decimal", () => {
    expect(parsePercent("6%")).toBeCloseTo(0.06);
    expect(parsePercent("0,5")).toBeCloseTo(0.5);
    expect(parsePercent(4)).toBeCloseTo(0.04);
  });
});

describe("normalizeContratoZoho", () => {
  const baseRaw: ZohoContratoRaw = {
    ID: "123",
    contractNumber: "C-1",
    paymentDate: "01/02/2024",
    Data_de_Pagamento: "02/02/2024",
    amount: "1.000,00",
    Valor_liquido_liberado: "",
    Valor_comissao: "",
    Comissao_Bonus: "10,00",
    amountComission: "",
    comissionPercent: "5",
    comissionPercentBonus: "1.5",
    sellerName: { zc_display_value: " Ana  Silva " },
    product: { name: "Produto X" },
    operationType: undefined,
    agentId: undefined,
    typerName: undefined,
    "Blueprint.Current_Stage": { zc_display_value: "Financeiro" },
  };

  it("normalizes monetary fields, flags and dimensions", () => {
    const result = normalizeContratoZoho(baseRaw);
    expect(result).not.toBeNull();
    const contrato = result!.contrato;

    // data_pagamento prioriza Data_de_Pagamento e marca inconsistencia quando diverge
    expect(contrato.inconsistenciaDataPagamento).toBe(true);
    expect(contrato.dataPagamento.toISOString()).toContain("2024-02-02");

    // líquido usa fallback e marca flag
    expect(contrato.liquidoLiberadoCent).toBe(100000);
    expect(contrato.liquidoFallback).toBe(true);

    // comissão calculada via percentual + bônus
    expect(contrato.comissaoBaseCent).toBe(5000);
    expect(contrato.comissaoBonusCent).toBe(1000);
    expect(contrato.comissaoTotalCent).toBe(6000);
    expect(contrato.comissaoCalculada).toBe(true);
    expect(contrato.pctComissaoBase).toBeCloseTo(0.05);
    expect(contrato.pctComissaoBonus).toBeCloseTo(0.015);

    // dimensões normalizadas
    expect(contrato.vendedorNome).toBe("Ana Silva");
    expect(contrato.digitadorNome).toBe("Sem info");
    expect(contrato.produto).toBe("Produto X");
    expect(contrato.etapaPipeline).toBe("Financeiro");
  });
});
