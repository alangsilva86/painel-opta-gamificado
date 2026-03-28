import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type GestaoResumoData = RouterOutputs["gestao"]["getResumo"];
export type GestaoHealthData = RouterOutputs["gestao"]["getHealth"];
export type GestaoTimeseriesPoint = GestaoResumoData["timeseries"][number];
export type GestaoSellerRow = GestaoResumoData["bySeller"][number];
export type GestaoProductRow = GestaoResumoData["byProduct"][number];
export type GestaoExecutiveMetric =
  GestaoResumoData["executiveMetrics"][number];
export type GestaoExecutiveNarrativeItem =
  GestaoResumoData["executiveNarrative"][number];
export type GestaoWatchlistItem = GestaoResumoData["watchlist"][number];
export type GestaoFreshnessInfo = GestaoResumoData["freshness"];
export type GestaoDataQualityInfo = GestaoResumoData["dataQuality"];
export type GestaoBusinessStatus = GestaoResumoData["businessStatus"];

export type GestaoSortBy = "data" | "comissao" | "liquido" | "takeRate";
export type GestaoSortDir = "asc" | "desc";
export type GestaoComparisonPreset =
  | "prev_month"
  | "prev_week"
  | "prev_year"
  | "custom";
export type GestaoTimeseriesGranularity = "day" | "week" | "month";
export type GestaoAnalystRole = "user" | "assistant" | "system";

export type GestaoFilterState = {
  etapaPipeline: string[];
  vendedorNome: string[];
  produto: string[];
  tipoOperacao: string[];
};

export type GestaoFilterKey = keyof GestaoFilterState;

export type GestaoFlagFilters = {
  comissaoCalculada: boolean;
  liquidoFallback: boolean;
  inconsistenciaData: boolean;
  semComissao: boolean;
};

export type GestaoSeriesVisibility = {
  comissao: boolean;
  liquido: boolean;
  liquidoSem: boolean;
};

export type GestaoViewState = {
  dateFrom: string;
  dateTo: string;
  comparisonMode: boolean;
  comparisonDateFrom: string;
  comparisonDateTo: string;
  filterState: GestaoFilterState;
  flagFilters: GestaoFlagFilters;
  sortBy: GestaoSortBy;
  sortDir: GestaoSortDir;
  incluirSemComissao: boolean;
  granularity: GestaoTimeseriesGranularity;
  seriesVisibility: GestaoSeriesVisibility;
  activeViewId?: string | null;
};

export type GestaoSavedView = {
  id: string;
  name: string;
  kind: "preset" | "custom";
  state: GestaoViewState;
  updatedAt: string;
};

export type GestaoAnalystAction =
  | {
      type: "apply_filter";
      label: string;
      key: GestaoFilterKey;
      values: string[];
    }
  | {
      type: "clear_filter";
      label: string;
      key: GestaoFilterKey;
    }
  | {
      type: "set_comparison_preset";
      label: string;
      preset: Exclude<GestaoComparisonPreset, "custom">;
    }
  | {
      type: "set_granularity";
      label: string;
      granularity: GestaoTimeseriesGranularity;
    }
  | {
      type: "toggle_sem_comissao";
      label: string;
      value: boolean;
    }
  | {
      type: "apply_saved_view";
      label: string;
      viewId: string;
    };

export type GestaoAnalystResponse = {
  answer: string;
  evidence: string[];
  riskLevel: "low" | "medium" | "high";
  recommendedActions: GestaoAnalystAction[];
  followUpPrompts: string[];
  contextLabel: string;
};

export type GestaoAnalystMessage = {
  id: string;
  role: GestaoAnalystRole;
  content: string;
  createdAt: string;
  response?: GestaoAnalystResponse;
};
