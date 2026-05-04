import { describe, expect, it } from "vitest";
import {
  calcularDistribuicaoDiariaInput,
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
});
