import { describe, it, expect } from "vitest";
import {
  contratoTemEstagioValido,
  filtrarContratosProcessadosValidos,
  filtrarContratosZohoValidos,
} from "../contractUtils";

describe("contractUtils - filtros de estágio", () => {
  it("deve aceitar estágios válidos", () => {
    expect(contratoTemEstagioValido("Financeiro")).toBe(true);
    expect(contratoTemEstagioValido("Comissão Paga")).toBe(true);
    expect(contratoTemEstagioValido(undefined)).toBe(true);
  });

  it("deve rejeitar estágios inválidos", () => {
    expect(contratoTemEstagioValido("Cancelado")).toBe(false);
    expect(contratoTemEstagioValido("Não Contratado")).toBe(false);
    expect(contratoTemEstagioValido("Em Digitação")).toBe(false);
  });

  it("filtra contratos processados inválidos", () => {
    const entrada = [
      { estagio: "Financeiro" },
      { estagio: "Cancelado" },
      { estagio: "Comercial" },
      { estagio: "Comissão Paga" },
    ];
    const saida = filtrarContratosProcessadosValidos(entrada);
    expect(saida).toHaveLength(2);
    expect(saida.every((c) => c.estagio === "Financeiro" || c.estagio === "Comissão Paga")).toBe(true);
  });

  it("filtra contratos Zoho inválidos", () => {
    const entrada = [
      { Estagio: { display_value: "Financeiro" } },
      { Estagio: { display_value: "Cancelado" } },
      { Estagio: { display_value: "Comercial" } },
      { Estagio: { display_value: "Aguardando Averbação" } },
    ] as any;
    const saida = filtrarContratosZohoValidos(entrada);
    expect(saida).toHaveLength(2);
    expect(saida.every((c) => c.Estagio.display_value !== "Cancelado" && c.Estagio.display_value !== "Comercial")).toBe(true);
  });
});
