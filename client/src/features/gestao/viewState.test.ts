import { describe, expect, it } from "vitest";
import {
  buildPresetViews,
  serializeGestaoViewStateToSearch,
  parseGestaoViewStateFromSearch,
} from "./viewState";
import type { GestaoViewState } from "./types";

const baseViewState: GestaoViewState = {
  dateFrom: "2026-03-01",
  dateTo: "2026-03-31",
  comparisonMode: true,
  comparisonDateFrom: "2026-02-01",
  comparisonDateTo: "2026-02-28",
  filterState: {
    etapaPipeline: ["Financeiro"],
    vendedorNome: ["Ana"],
    produto: ["CDC"],
    tipoOperacao: ["Portabilidade"],
  },
  flagFilters: {
    comissaoCalculada: true,
    liquidoFallback: false,
    inconsistenciaData: true,
    semComissao: false,
  },
  sortBy: "comissao",
  sortDir: "desc",
  incluirSemComissao: false,
  granularity: "week",
  seriesVisibility: {
    comissao: true,
    liquido: true,
    liquidoSem: false,
  },
  activeViewId: "view-ana",
};

describe("viewState helpers", () => {
  it("serializa e faz parse do estado sem perder filtros", () => {
    const query = serializeGestaoViewStateToSearch(baseViewState);
    const parsed = parseGestaoViewStateFromSearch(query);

    expect(parsed).toEqual({
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
      comparisonMode: true,
      comparisonDateFrom: "2026-02-01",
      comparisonDateTo: "2026-02-28",
      filterState: baseViewState.filterState,
      flagFilters: baseViewState.flagFilters,
      sortBy: "comissao",
      sortDir: "desc",
      incluirSemComissao: false,
      granularity: "week",
      seriesVisibility: baseViewState.seriesVisibility,
      activeViewId: "view-ana",
    });
  });

  it("gera presets executivos consistentes", () => {
    const presets = buildPresetViews(baseViewState);

    expect(presets.map(view => view.id)).toEqual([
      "preset-diretoria",
      "preset-comercial",
      "preset-qualidade",
    ]);
    expect(presets[0]?.state.comparisonDateFrom).toBe("2026-02-01");
    expect(presets[0]?.state.comparisonDateTo).toBe("2026-02-28");
    expect(presets[1]?.state.comparisonDateFrom).toBe("2026-02-22");
    expect(presets[1]?.state.comparisonDateTo).toBe("2026-03-24");
    expect(presets[2]?.state.flagFilters.semComissao).toBe(true);
    expect(presets[2]?.state.comparisonMode).toBe(false);
  });
});
