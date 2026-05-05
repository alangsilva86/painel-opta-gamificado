import { describe, expect, it } from "vitest";
import {
  calcularDistribuicaoDiariaInput,
  isSchemaCompatibilityError,
  resolverPercentualMetaCompat,
  validarLimiteDistribuicao,
} from "./metasService";

describe("metasService distribuição diária", () => {
  it("converte percentual em valor usando a meta mensal", () => {
    const result = calcularDistribuicaoDiariaInput({
      metaMensal: 100000,
      modo: "percentual",
      percentualMeta: 12.5,
    });

    expect(result.percentualMeta).toBeCloseTo(12.5);
    expect(result.metaValor).toBeCloseTo(12500);
  });

  it("converte valor em percentual usando a meta mensal", () => {
    const result = calcularDistribuicaoDiariaInput({
      metaMensal: 80000,
      modo: "valor",
      metaValor: 20000,
    });

    expect(result.percentualMeta).toBeCloseTo(25);
    expect(result.metaValor).toBeCloseTo(20000);
  });

  it("permite distribuição abaixo de 100%", () => {
    const total = validarLimiteDistribuicao({
      percentualAtualSemDia: 35,
      novoPercentual: 20,
    });

    expect(total).toBeCloseTo(55);
  });

  it("bloqueia distribuição acima de 100%", () => {
    expect(() =>
      validarLimiteDistribuicao({
        percentualAtualSemDia: 80,
        novoPercentual: 20.01,
      })
    ).toThrow("Distribuição acima de 100%");
  });

  it("recalcula percentual a partir do valor quando percentualMeta não existe", () => {
    expect(resolverPercentualMetaCompat(50000, "12500")).toBeCloseTo(25);
  });

  it("detecta erro de tabela ausente para fallback de calendário", () => {
    const error = {
      code: "ER_NO_SUCH_TABLE",
      errno: 1146,
      message: "Table 'db.metas_calendario_dias' doesn't exist",
    };

    expect(
      isSchemaCompatibilityError(error, { table: "metas_calendario_dias" })
    ).toBe(true);
  });

  it("detecta erro de coluna ausente para fallback legado de metas diárias", () => {
    const error = {
      code: "ER_BAD_FIELD_ERROR",
      errno: 1054,
      message: "Unknown column 'percentualMeta' in 'field list'",
    };

    expect(
      isSchemaCompatibilityError(error, { column: "percentualMeta" })
    ).toBe(true);
  });
});
