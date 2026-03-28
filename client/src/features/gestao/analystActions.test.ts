import { describe, expect, it, vi } from "vitest";
import { executeGestaoAnalystAction } from "./analystActions";
import type { GestaoSavedView, GestaoViewState } from "./types";

const currentViewState: GestaoViewState = {
  dateFrom: "2026-03-01",
  dateTo: "2026-03-31",
  comparisonMode: false,
  comparisonDateFrom: "",
  comparisonDateTo: "",
  filterState: {
    etapaPipeline: [],
    vendedorNome: [],
    produto: [],
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

const savedViews: GestaoSavedView[] = [
  {
    id: "preset-diretoria",
    name: "Diretoria",
    kind: "preset",
    updatedAt: "2026-03-28T12:00:00.000Z",
    state: currentViewState,
  },
];

describe("executeGestaoAnalystAction", () => {
  it("aplica filtro estruturado", () => {
    const applyFilter = vi.fn();

    const applied = executeGestaoAnalystAction({
      action: {
        type: "apply_filter",
        label: "Filtrar produto",
        key: "produto",
        values: ["CDC"],
      },
      currentViewState,
      applyFilter,
      applyViewState: vi.fn(),
      setGranularity: vi.fn(),
      setIncluirSemComissao: vi.fn(),
      availableViews: savedViews,
      applySavedViewLocally: vi.fn(),
    });

    expect(applied).toBe(true);
    expect(applyFilter).toHaveBeenCalledWith({ produto: ["CDC"] });
  });

  it("ativa preset de comparação preservando o recorte atual", () => {
    const applyViewState = vi.fn();

    executeGestaoAnalystAction({
      action: {
        type: "set_comparison_preset",
        label: "Comparar mês anterior",
        preset: "prev_month",
      },
      currentViewState,
      applyFilter: vi.fn(),
      applyViewState,
      setGranularity: vi.fn(),
      setIncluirSemComissao: vi.fn(),
      availableViews: savedViews,
      applySavedViewLocally: vi.fn(),
    });

    expect(applyViewState).toHaveBeenCalledWith(
      expect.objectContaining({
        comparisonMode: true,
        comparisonDateFrom: "2026-02-01",
        comparisonDateTo: "2026-02-28",
        filterState: currentViewState.filterState,
        flagFilters: currentViewState.flagFilters,
      })
    );
  });

  it("abre uma vista salva localmente sem depender de parsing textual", () => {
    const applySavedViewLocally = vi.fn();

    const applied = executeGestaoAnalystAction({
      action: {
        type: "apply_saved_view",
        label: "Diretoria",
        viewId: "preset-diretoria",
      },
      currentViewState,
      applyFilter: vi.fn(),
      applyViewState: vi.fn(),
      setGranularity: vi.fn(),
      setIncluirSemComissao: vi.fn(),
      availableViews: savedViews,
      applySavedViewLocally,
    });

    expect(applied).toBe(true);
    expect(applySavedViewLocally).toHaveBeenCalledWith(savedViews[0]);
  });
});
