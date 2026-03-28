import { describe, expect, it } from "vitest";
import {
  buildGestaoAnalystContextLabel,
  buildGestaoAnalystContextSignature,
  createGestaoAnalystContextUpdatedMessage,
} from "./analystChatUtils";
import type { GestaoViewState } from "./types";

const baseViewState: GestaoViewState = {
  dateFrom: "2026-03-01",
  dateTo: "2026-03-31",
  comparisonMode: false,
  comparisonDateFrom: "",
  comparisonDateTo: "",
  filterState: {
    etapaPipeline: [],
    vendedorNome: ["Ana"],
    produto: ["CDC"],
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
};

describe("analystChatUtils", () => {
  it("gera uma label de contexto legível", () => {
    const label = buildGestaoAnalystContextLabel(baseViewState, null);

    expect(label).toContain("Período 2026-03-01 a 2026-03-31");
    expect(label).toContain("Vendedoras: Ana");
    expect(label).toContain("Produtos: CDC");
  });

  it("muda a assinatura quando o recorte muda", () => {
    const original = buildGestaoAnalystContextSignature(baseViewState);
    const changed = buildGestaoAnalystContextSignature({
      ...baseViewState,
      granularity: "week",
    });

    expect(changed).not.toBe(original);
  });

  it("cria marcador de atualização de contexto", () => {
    const message = createGestaoAnalystContextUpdatedMessage(
      "Período 2026-03-01 a 2026-03-31"
    );

    expect(message.role).toBe("system");
    expect(message.content).toContain("Contexto atualizado para novo recorte");
  });
});
