import { describe, expect, it } from "vitest";
import type { InsertContrato } from "../../drizzle/schema";
import {
  buildContratoInsertValues,
  buildContratoUpdateSet,
  buildLegacyContratoInsertValues,
  buildLegacyContratoUpdateSet,
  hasFullContratoDimensionSchema,
} from "./contratosCompat";

const baseContrato: InsertContrato = {
  idContrato: "ctr_123",
  numeroContrato: "123",
  dataPagamento: new Date("2026-03-15T00:00:00.000Z"),
  liquidoLiberadoCent: 100_00,
  comissaoBaseCent: 10_00,
  comissaoBonusCent: 5_00,
  comissaoTotalCent: 15_00,
  pctComissaoBase: "0.1",
  pctComissaoBonus: "0.05",
  vendedorId: "seller_1",
  vendedorNome: "Ana",
  digitadorId: "typer_1",
  digitadorNome: "Carlos",
  produtoId: "product_1",
  produto: "CDC",
  tipoOperacaoId: "operation_1",
  tipoOperacao: "Portabilidade",
  agenteLookupId: "agent_lookup_1",
  agenteId: "agent_1",
  etapaPipeline: "Financeiro",
  inconsistenciaDataPagamento: false,
  liquidoFallback: false,
  comissaoCalculada: false,
  updatedAt: new Date("2026-03-15T12:00:00.000Z"),
};

const allOptionalColumns = new Set([
  "vendedor_id",
  "digitador_id",
  "produto_id",
  "tipo_operacao_id",
  "agente_lookup_id",
]);

describe("contratosCompat", () => {
  it("detecta quando o schema completo das colunas dimensionais está disponível", () => {
    expect(hasFullContratoDimensionSchema(allOptionalColumns)).toBe(true);
    expect(hasFullContratoDimensionSchema(new Set(["vendedor_id"]))).toBe(false);
  });

  it("gera payload legado sem colunas dimensionais opcionais", () => {
    const values = buildLegacyContratoInsertValues(baseContrato);

    expect(values).not.toHaveProperty("vendedorId");
    expect(values).not.toHaveProperty("digitadorId");
    expect(values).not.toHaveProperty("produtoId");
    expect(values).not.toHaveProperty("tipoOperacaoId");
    expect(values).not.toHaveProperty("agenteLookupId");
    expect(values.vendedorNome).toBe("Ana");
    expect(values.agenteId).toBe("agent_1");
  });

  it("inclui colunas dimensionais opcionais quando elas existem", () => {
    const values = buildContratoInsertValues(baseContrato, allOptionalColumns);

    expect(values.vendedorId).toBe("seller_1");
    expect(values.digitadorId).toBe("typer_1");
    expect(values.produtoId).toBe("product_1");
    expect(values.tipoOperacaoId).toBe("operation_1");
    expect(values.agenteLookupId).toBe("agent_lookup_1");
  });

  it("não tenta atualizar a chave primária no upsert", () => {
    const values = buildContratoUpdateSet(baseContrato, allOptionalColumns);

    expect(values).not.toHaveProperty("idContrato");
    expect(values.numeroContrato).toBe("123");
    expect(values.vendedorId).toBe("seller_1");
  });

  it("gera update legado sem chave primária nem colunas opcionais", () => {
    const values = buildLegacyContratoUpdateSet(baseContrato);

    expect(values).not.toHaveProperty("idContrato");
    expect(values).not.toHaveProperty("vendedorId");
    expect(values.numeroContrato).toBe("123");
    expect(values.agenteId).toBe("agent_1");
  });
});
