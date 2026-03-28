import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  GestaoSavedView,
  GestaoSeriesVisibility,
  GestaoTimeseriesGranularity,
  GestaoViewState,
} from "./types";
import {
  buildPresetViews,
  createCustomSavedView,
  GESTAO_VIEW_DEFAULTS,
  loadLastViewId,
  loadSavedViews,
  persistLastViewId,
  persistSavedViews,
  serializeGestaoViewStateToSearch,
} from "./viewState";

type BaseViewState = Omit<GestaoViewState, "activeViewId">;

type SyncableViewState = Pick<
  GestaoViewState,
  | "dateFrom"
  | "dateTo"
  | "comparisonMode"
  | "comparisonDateFrom"
  | "comparisonDateTo"
>;

type UseGestaoViewManagerArgs = {
  baseViewState: BaseViewState;
  initialActiveViewId?: string | null;
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
  clearFilters: () => void;
  setGranularity: (value: GestaoTimeseriesGranularity) => void;
  setSeriesVisibility: (value: GestaoSeriesVisibility) => void;
  setHasFetched: (value: boolean) => void;
  syncForViewState: (viewState: SyncableViewState) => Promise<unknown>;
};

export function useGestaoViewManager({
  baseViewState,
  initialActiveViewId,
  applyViewState,
  clearFilters,
  setGranularity,
  setSeriesVisibility,
  setHasFetched,
  syncForViewState,
}: UseGestaoViewManagerArgs) {
  const [customViews, setCustomViews] = useState<GestaoSavedView[]>(() =>
    typeof window !== "undefined" ? loadSavedViews() : []
  );
  const [activeViewId, setActiveViewId] = useState<string | null>(
    initialActiveViewId || null
  );
  const [lastViewId, setLastViewId] = useState<string | null>(() =>
    typeof window !== "undefined" ? loadLastViewId() : null
  );

  const currentViewState = useMemo<GestaoViewState>(
    () => ({
      ...baseViewState,
      activeViewId,
    }),
    [activeViewId, baseViewState]
  );

  const presetViews = useMemo(
    () => buildPresetViews({ ...currentViewState, activeViewId: null }),
    [currentViewState]
  );

  const allSavedViews = useMemo(
    () => [...presetViews, ...customViews],
    [customViews, presetViews]
  );

  const lastViewName = useMemo(
    () => allSavedViews.find(view => view.id === lastViewId)?.name ?? null,
    [allSavedViews, lastViewId]
  );

  useEffect(() => {
    persistSavedViews(customViews);
  }, [customViews]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !currentViewState.dateFrom ||
      !currentViewState.dateTo
    ) {
      return;
    }

    const nextSearch = serializeGestaoViewStateToSearch(currentViewState);
    const currentSearch = window.location.search.replace(/^\?/, "");
    if (currentSearch === nextSearch) return;

    const nextUrl = nextSearch
      ? `${window.location.pathname}?${nextSearch}`
      : window.location.pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [currentViewState]);

  const clearActiveView = () => {
    setActiveViewId(null);
    setLastViewId(null);
    persistLastViewId(null);
  };

  const applySavedView = async (view: GestaoSavedView) => {
    applyViewState({
      dateFrom: view.state.dateFrom,
      dateTo: view.state.dateTo,
      comparisonMode: view.state.comparisonMode,
      comparisonDateFrom: view.state.comparisonDateFrom,
      comparisonDateTo: view.state.comparisonDateTo,
      filterState: view.state.filterState,
      flagFilters: view.state.flagFilters,
      sortBy: view.state.sortBy,
      sortDir: view.state.sortDir,
      incluirSemComissao: view.state.incluirSemComissao,
    });
    setGranularity(view.state.granularity);
    setSeriesVisibility(view.state.seriesVisibility);
    setActiveViewId(view.id);
    setLastViewId(view.id);
    persistLastViewId(view.id);
    setHasFetched(true);

    try {
      await syncForViewState(view.state);
      toast.success(`Vista "${view.name}" aplicada.`);
    } catch (error) {
      console.error("[GestaoLog] Erro ao aplicar vista salva", error);
      toast.error("Falha ao sincronizar a vista selecionada");
    }
  };

  const handleSaveView = (name: string) => {
    const nextView = createCustomSavedView(name, {
      ...currentViewState,
      activeViewId: null,
    });
    setCustomViews(prev => [nextView, ...prev]);
    setActiveViewId(nextView.id);
    setLastViewId(nextView.id);
    persistLastViewId(nextView.id);
    toast.success(`Vista "${name}" salva.`);
  };

  const handleRenameView = (id: string, name: string) => {
    setCustomViews(prev =>
      prev.map(view =>
        view.id === id
          ? { ...view, name, updatedAt: new Date().toISOString() }
          : view
      )
    );
    toast.success("Vista atualizada.");
  };

  const handleDuplicateView = (id: string) => {
    const source = customViews.find(view => view.id === id);
    if (!source) return;

    const duplicated = createCustomSavedView(
      `${source.name} copy`,
      source.state
    );
    setCustomViews(prev => [duplicated, ...prev]);
    toast.success("Vista duplicada.");
  };

  const handleDeleteView = (id: string) => {
    setCustomViews(prev => prev.filter(view => view.id !== id));
    if (activeViewId === id) {
      clearActiveView();
    }
    toast.success("Vista removida.");
  };

  const handleResetView = () => {
    clearFilters();
    setGranularity("day");
    setSeriesVisibility(GESTAO_VIEW_DEFAULTS.seriesVisibility);
    clearActiveView();
  };

  const handleRestoreLastView = async () => {
    const lastView = allSavedViews.find(view => view.id === lastViewId);
    if (!lastView) {
      toast.error("Nenhum último recorte salvo disponível.");
      return;
    }
    await applySavedView(lastView);
  };

  return {
    activeViewId,
    applySavedView,
    clearActiveView,
    customViews,
    handleDeleteView,
    handleDuplicateView,
    handleRenameView,
    handleResetView,
    handleRestoreLastView,
    handleSaveView,
    lastViewName,
    presetViews,
  };
}
