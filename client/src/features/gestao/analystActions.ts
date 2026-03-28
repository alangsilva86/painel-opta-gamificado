import { buildComparisonRange } from "./dateRange";
import type {
  GestaoAnalystAction,
  GestaoSavedView,
  GestaoViewState,
} from "./types";

type ExecuteGestaoAnalystActionArgs = {
  action: GestaoAnalystAction;
  currentViewState: GestaoViewState;
  applyFilter: (
    partial: Partial<GestaoViewState["filterState"]>
  ) => void;
  applyViewState: (
    view: Partial<{
      dateFrom: string;
      dateTo: string;
      comparisonMode: boolean;
      comparisonDateFrom: string;
      comparisonDateTo: string;
      filterState: GestaoViewState["filterState"];
      flagFilters: GestaoViewState["flagFilters"];
      sortBy: GestaoViewState["sortBy"];
      sortDir: GestaoViewState["sortDir"];
      incluirSemComissao: boolean;
    }>
  ) => void;
  setGranularity: (value: GestaoViewState["granularity"]) => void;
  setIncluirSemComissao: (value: boolean) => void;
  availableViews: GestaoSavedView[];
  applySavedViewLocally: (view: GestaoSavedView) => void;
};

export function executeGestaoAnalystAction({
  action,
  currentViewState,
  applyFilter,
  applyViewState,
  setGranularity,
  setIncluirSemComissao,
  availableViews,
  applySavedViewLocally,
}: ExecuteGestaoAnalystActionArgs) {
  if (action.type === "apply_filter") {
    applyFilter({ [action.key]: action.values });
    return true;
  }

  if (action.type === "clear_filter") {
    applyFilter({ [action.key]: [] });
    return true;
  }

  if (action.type === "set_comparison_preset") {
    const comparison = buildComparisonRange(
      action.preset,
      currentViewState.dateFrom,
      currentViewState.dateTo
    );

    applyViewState({
      dateFrom: currentViewState.dateFrom,
      dateTo: currentViewState.dateTo,
      comparisonMode: true,
      comparisonDateFrom: comparison.comparisonDateFrom,
      comparisonDateTo: comparison.comparisonDateTo,
      filterState: currentViewState.filterState,
      flagFilters: currentViewState.flagFilters,
      sortBy: currentViewState.sortBy,
      sortDir: currentViewState.sortDir,
      incluirSemComissao: currentViewState.incluirSemComissao,
    });
    return true;
  }

  if (action.type === "set_granularity") {
    setGranularity(action.granularity);
    return true;
  }

  if (action.type === "toggle_sem_comissao") {
    setIncluirSemComissao(action.value);
    return true;
  }

  const view = availableViews.find(item => item.id === action.viewId);
  if (!view) return false;
  applySavedViewLocally(view);
  return true;
}
