import type {
  GestaoComparisonPreset,
  GestaoFilterState,
  GestaoFlagFilters,
  GestaoSavedView,
  GestaoSeriesVisibility,
  GestaoSortBy,
  GestaoSortDir,
  GestaoTimeseriesGranularity,
  GestaoViewState,
} from "./types";

const SAVED_VIEWS_STORAGE_KEY = "gestao:saved-views";
const LAST_VIEW_STORAGE_KEY = "gestao:last-view-id";

const EMPTY_FILTERS: GestaoFilterState = {
  etapaPipeline: [],
  vendedorNome: [],
  produto: [],
  tipoOperacao: [],
};

const EMPTY_FLAGS: GestaoFlagFilters = {
  comissaoCalculada: false,
  liquidoFallback: false,
  inconsistenciaData: false,
  semComissao: false,
};

const DEFAULT_SERIES_VISIBILITY: GestaoSeriesVisibility = {
  comissao: true,
  liquido: true,
  liquidoSem: true,
};

function splitParam(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function readBoolean(value: string | null, fallback: boolean) {
  if (value === null) return fallback;
  return value === "1" || value === "true";
}

function formatISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDays(dateISO: string, days: number) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + days);
  return formatISO(date);
}

function shiftMonths(dateISO: string, months: number) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const current = new Date(year, (month || 1) - 1, day || 1);
  const targetMonth = current.getMonth() + months;
  const lastDay = new Date(current.getFullYear(), targetMonth + 1, 0).getDate();
  return formatISO(
    new Date(
      current.getFullYear(),
      targetMonth,
      Math.min(current.getDate(), lastDay)
    )
  );
}

function shiftYears(dateISO: string, years: number) {
  const [year, month, day] = dateISO.split("-").map(Number);
  return formatISO(
    new Date((year || 1970) + years, (month || 1) - 1, day || 1)
  );
}

function buildComparisonRange(
  mode: Exclude<GestaoComparisonPreset, "custom">,
  dateFrom: string,
  dateTo: string
) {
  if (mode === "prev_week") {
    return {
      comparisonDateFrom: shiftDays(dateFrom, -7),
      comparisonDateTo: shiftDays(dateTo, -7),
    };
  }

  if (mode === "prev_year") {
    return {
      comparisonDateFrom: shiftYears(dateFrom, -1),
      comparisonDateTo: shiftYears(dateTo, -1),
    };
  }

  return {
    comparisonDateFrom: shiftMonths(dateFrom, -1),
    comparisonDateTo: shiftMonths(dateTo, -1),
  };
}

function createViewId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `view_${Math.random().toString(36).slice(2, 10)}`;
}

function cloneViewState(state: GestaoViewState): GestaoViewState {
  return {
    ...state,
    filterState: {
      etapaPipeline: [...state.filterState.etapaPipeline],
      vendedorNome: [...state.filterState.vendedorNome],
      produto: [...state.filterState.produto],
      tipoOperacao: [...state.filterState.tipoOperacao],
    },
    flagFilters: { ...state.flagFilters },
    seriesVisibility: { ...state.seriesVisibility },
  };
}

export function parseGestaoViewStateFromSearch(search: string) {
  const params = new URLSearchParams(search);
  const granularity = params.get(
    "granularity"
  ) as GestaoTimeseriesGranularity | null;
  const sortBy = params.get("sortBy") as GestaoSortBy | null;
  const sortDir = params.get("sortDir") as GestaoSortDir | null;

  return {
    dateFrom: params.get("from") || undefined,
    dateTo: params.get("to") || undefined,
    comparisonMode: readBoolean(params.get("comparison"), false),
    comparisonDateFrom: params.get("compareFrom") || "",
    comparisonDateTo: params.get("compareTo") || "",
    filterState: {
      etapaPipeline: splitParam(params.get("stage")),
      vendedorNome: splitParam(params.get("seller")),
      produto: splitParam(params.get("product")),
      tipoOperacao: splitParam(params.get("operation")),
    },
    flagFilters: {
      comissaoCalculada: readBoolean(params.get("flagCalc"), false),
      liquidoFallback: readBoolean(params.get("flagFallback"), false),
      inconsistenciaData: readBoolean(params.get("flagDate"), false),
      semComissao: readBoolean(params.get("flagNoCommission"), false),
    },
    sortBy: sortBy || undefined,
    sortDir: sortDir || undefined,
    incluirSemComissao: readBoolean(params.get("withNoCommission"), true),
    granularity: granularity || undefined,
    seriesVisibility: {
      comissao: readBoolean(params.get("seriesCommission"), true),
      liquido: readBoolean(params.get("seriesNet"), true),
      liquidoSem: readBoolean(params.get("seriesNoCommissionNet"), true),
    },
    activeViewId: params.get("view") || undefined,
  };
}

export function serializeGestaoViewStateToSearch(state: GestaoViewState) {
  const params = new URLSearchParams();
  params.set("from", state.dateFrom);
  params.set("to", state.dateTo);
  params.set("comparison", state.comparisonMode ? "1" : "0");
  if (state.comparisonDateFrom)
    params.set("compareFrom", state.comparisonDateFrom);
  if (state.comparisonDateTo) params.set("compareTo", state.comparisonDateTo);
  if (state.filterState.etapaPipeline.length > 0) {
    params.set("stage", state.filterState.etapaPipeline.join(","));
  }
  if (state.filterState.vendedorNome.length > 0) {
    params.set("seller", state.filterState.vendedorNome.join(","));
  }
  if (state.filterState.produto.length > 0) {
    params.set("product", state.filterState.produto.join(","));
  }
  if (state.filterState.tipoOperacao.length > 0) {
    params.set("operation", state.filterState.tipoOperacao.join(","));
  }
  if (state.flagFilters.comissaoCalculada) params.set("flagCalc", "1");
  if (state.flagFilters.liquidoFallback) params.set("flagFallback", "1");
  if (state.flagFilters.inconsistenciaData) params.set("flagDate", "1");
  if (state.flagFilters.semComissao) params.set("flagNoCommission", "1");
  params.set("sortBy", state.sortBy);
  params.set("sortDir", state.sortDir);
  params.set("withNoCommission", state.incluirSemComissao ? "1" : "0");
  params.set("granularity", state.granularity);
  params.set("seriesCommission", state.seriesVisibility.comissao ? "1" : "0");
  params.set("seriesNet", state.seriesVisibility.liquido ? "1" : "0");
  params.set(
    "seriesNoCommissionNet",
    state.seriesVisibility.liquidoSem ? "1" : "0"
  );
  if (state.activeViewId) params.set("view", state.activeViewId);
  return params.toString();
}

export function buildPresetViews(base: GestaoViewState): GestaoSavedView[] {
  const baseState = cloneViewState(base);
  const previousMonth = buildComparisonRange(
    "prev_month",
    base.dateFrom,
    base.dateTo
  );
  const previousWeek = buildComparisonRange(
    "prev_week",
    base.dateFrom,
    base.dateTo
  );

  return [
    {
      id: "preset-diretoria",
      name: "Diretoria",
      kind: "preset",
      updatedAt: new Date().toISOString(),
      state: {
        ...baseState,
        comparisonMode: true,
        comparisonDateFrom: previousMonth.comparisonDateFrom,
        comparisonDateTo: previousMonth.comparisonDateTo,
        granularity: "week",
        incluirSemComissao: true,
        flagFilters: { ...EMPTY_FLAGS },
      },
    },
    {
      id: "preset-comercial",
      name: "Comercial",
      kind: "preset",
      updatedAt: new Date().toISOString(),
      state: {
        ...baseState,
        comparisonMode: true,
        comparisonDateFrom: previousWeek.comparisonDateFrom,
        comparisonDateTo: previousWeek.comparisonDateTo,
        granularity: "day",
        incluirSemComissao: false,
        seriesVisibility: {
          comissao: true,
          liquido: true,
          liquidoSem: false,
        },
        flagFilters: { ...EMPTY_FLAGS },
      },
    },
    {
      id: "preset-qualidade",
      name: "Qualidade",
      kind: "preset",
      updatedAt: new Date().toISOString(),
      state: {
        ...baseState,
        comparisonMode: false,
        comparisonDateFrom: "",
        comparisonDateTo: "",
        granularity: "day",
        incluirSemComissao: true,
        flagFilters: {
          ...EMPTY_FLAGS,
          semComissao: true,
        },
      },
    },
  ];
}

export function loadSavedViews() {
  if (typeof window === "undefined") return [] as GestaoSavedView[];
  const raw = window.localStorage.getItem(SAVED_VIEWS_STORAGE_KEY);
  if (!raw) return [] as GestaoSavedView[];
  try {
    const parsed = JSON.parse(raw) as GestaoSavedView[];
    return parsed.filter(view => view.kind === "custom");
  } catch {
    return [] as GestaoSavedView[];
  }
}

export function persistSavedViews(views: GestaoSavedView[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, JSON.stringify(views));
}

export function loadLastViewId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_VIEW_STORAGE_KEY);
}

export function persistLastViewId(viewId: string | null) {
  if (typeof window === "undefined") return;
  if (!viewId) {
    window.localStorage.removeItem(LAST_VIEW_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(LAST_VIEW_STORAGE_KEY, viewId);
}

export function createCustomSavedView(
  name: string,
  state: GestaoViewState
): GestaoSavedView {
  return {
    id: createViewId(),
    name,
    kind: "custom",
    state: cloneViewState(state),
    updatedAt: new Date().toISOString(),
  };
}

export const GESTAO_VIEW_DEFAULTS = {
  filters: EMPTY_FILTERS,
  flags: EMPTY_FLAGS,
  seriesVisibility: DEFAULT_SERIES_VISIBILITY,
};
