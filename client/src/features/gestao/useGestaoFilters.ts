import { useCallback, useMemo, useState } from "react";
import {
  buildComparisonRange,
  endOfMonthISO,
  normalizeDateRange,
  startOfMonthISO,
} from "./dateRange";
import type {
  GestaoComparisonPreset as ComparisonPreset,
  GestaoFilterState as FilterState,
  GestaoFlagFilters as FlagFilters,
  GestaoSortBy as SortBy,
  GestaoSortDir as SortDir,
} from "./types";

export type { ComparisonPreset, FilterState, FlagFilters, SortBy, SortDir };

const initialFilterState: FilterState = {
  etapaPipeline: [],
  vendedorNome: [],
  produto: [],
  tipoOperacao: [],
};

const initialFlags: FlagFilters = {
  comissaoCalculada: false,
  liquidoFallback: false,
  inconsistenciaData: false,
  semComissao: false,
};

type UseGestaoFiltersOptions = {
  initialState?: Partial<{
    dateFrom: string;
    dateTo: string;
    comparisonMode: boolean;
    comparisonDateFrom: string;
    comparisonDateTo: string;
    filterState: FilterState;
    flagFilters: FlagFilters;
    sortBy: SortBy;
    sortDir: SortDir;
    incluirSemComissao: boolean;
  }>;
};

function cloneFilterState(state?: Partial<FilterState>): FilterState {
  return {
    etapaPipeline: [...(state?.etapaPipeline ?? [])],
    vendedorNome: [...(state?.vendedorNome ?? [])],
    produto: [...(state?.produto ?? [])],
    tipoOperacao: [...(state?.tipoOperacao ?? [])],
  };
}

function cloneFlags(flags?: Partial<FlagFilters>): FlagFilters {
  return {
    comissaoCalculada: flags?.comissaoCalculada ?? false,
    liquidoFallback: flags?.liquidoFallback ?? false,
    inconsistenciaData: flags?.inconsistenciaData ?? false,
    semComissao: flags?.semComissao ?? false,
  };
}

export function useGestaoFilters(
  now = new Date(),
  options?: UseGestaoFiltersOptions
) {
  const initialFrom = startOfMonthISO(now);
  const initialTo = endOfMonthISO(now);
  const initialState = options?.initialState;
  const defaultDateFrom = initialState?.dateFrom || initialFrom;
  const defaultDateTo = initialState?.dateTo || initialTo;
  const defaultFilters = cloneFilterState(initialState?.filterState);
  const defaultFlags = cloneFlags(initialState?.flagFilters);
  const defaultComparisonMode = initialState?.comparisonMode ?? false;
  const defaultComparisonDateFrom = initialState?.comparisonDateFrom || "";
  const defaultComparisonDateTo = initialState?.comparisonDateTo || "";
  const defaultSortBy = initialState?.sortBy || "data";
  const defaultSortDir = initialState?.sortDir || "desc";
  const defaultIncludeNoCommission = initialState?.incluirSemComissao ?? true;

  const [draftDateFrom, setDraftDateFrom] = useState(defaultDateFrom);
  const [draftDateTo, setDraftDateTo] = useState(defaultDateTo);
  const [appliedDateFrom, setAppliedDateFrom] = useState(defaultDateFrom);
  const [appliedDateTo, setAppliedDateTo] = useState(defaultDateTo);

  const [draftFilterState, setDraftFilterState] =
    useState<FilterState>(defaultFilters);
  const [filterState, setFilterState] = useState<FilterState>(defaultFilters);

  const [draftComparisonMode, setDraftComparisonMode] = useState(
    defaultComparisonMode
  );
  const [comparisonModeApplied, setComparisonModeApplied] = useState(
    defaultComparisonMode
  );
  const [draftComparisonDateFrom, setDraftComparisonDateFrom] = useState(
    defaultComparisonDateFrom
  );
  const [draftComparisonDateTo, setDraftComparisonDateTo] = useState(
    defaultComparisonDateTo
  );
  const [appliedComparisonDateFrom, setAppliedComparisonDateFrom] = useState(
    defaultComparisonDateFrom
  );
  const [appliedComparisonDateTo, setAppliedComparisonDateTo] = useState(
    defaultComparisonDateTo
  );

  const [flagFilters, setFlagFilters] = useState<FlagFilters>(defaultFlags);
  const [sortBy, setSortBy] = useState<SortBy>(defaultSortBy);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);
  const [incluirSemComissao, setIncluirSemComissao] = useState(
    defaultIncludeNoCommission
  );
  const [page, setPage] = useState(1);

  const setDateFrom = useCallback((value: string) => {
    console.info("[GestaoLog] Data inicial atualizada (rascunho)", { value });
    setDraftDateFrom(value);
  }, []);

  const setDateTo = useCallback((value: string) => {
    console.info("[GestaoLog] Data final atualizada (rascunho)", { value });
    setDraftDateTo(value);
  }, []);

  const filters = useMemo(
    () => ({
      dateFrom: appliedDateFrom,
      dateTo: appliedDateTo,
      ...filterState,
    }),
    [appliedDateFrom, appliedDateTo, filterState]
  );

  const comparisonFilters = useMemo(() => {
    const normalized = normalizeDateRange(
      appliedComparisonDateFrom,
      appliedComparisonDateTo
    );
    if (!comparisonModeApplied || !normalized) return null;
    return {
      dateFrom: normalized.dateFrom,
      dateTo: normalized.dateTo,
      ...filterState,
    };
  }, [
    appliedComparisonDateFrom,
    appliedComparisonDateTo,
    comparisonModeApplied,
    filterState,
  ]);

  const applyFilter = useCallback((partial: Partial<FilterState>) => {
    console.info("[GestaoLog] Aplicando filtro pontual", partial);
    setPage(1);
    setFilterState(prev => ({ ...prev, ...partial }));
    setDraftFilterState(prev => ({ ...prev, ...partial }));
  }, []);

  const toggleDraftFilter = useCallback(
    (key: keyof FilterState, value: string) => {
      setPage(1);
      setDraftFilterState(prev => {
        const current = prev[key];
        const next = current.includes(value)
          ? current.filter(item => item !== value)
          : [...current, value];
        return { ...prev, [key]: next };
      });
    },
    []
  );

  const clearFilters = useCallback(() => {
    const newDateFrom = startOfMonthISO(now);
    const newDateTo = endOfMonthISO(now);
    console.info("[GestaoLog] Reset de filtros solicitado", {
      newDateFrom,
      newDateTo,
    });
    setPage(1);
    setDraftFilterState({ ...initialFilterState });
    setFilterState({ ...initialFilterState });
    setFlagFilters({ ...initialFlags });
    setIncluirSemComissao(true);
    setDraftDateFrom(newDateFrom);
    setDraftDateTo(newDateTo);
    setAppliedDateFrom(newDateFrom);
    setAppliedDateTo(newDateTo);
    setDraftComparisonMode(false);
    setComparisonModeApplied(false);
    setDraftComparisonDateFrom("");
    setDraftComparisonDateTo("");
    setAppliedComparisonDateFrom("");
    setAppliedComparisonDateTo("");
  }, [now]);

  const applyViewState = useCallback(
    (
      view: Partial<{
        dateFrom: string;
        dateTo: string;
        comparisonMode: boolean;
        comparisonDateFrom: string;
        comparisonDateTo: string;
        filterState: FilterState;
        flagFilters: FlagFilters;
        sortBy: SortBy;
        sortDir: SortDir;
        incluirSemComissao: boolean;
      }>
    ) => {
      const nextDateFrom = view.dateFrom || initialFrom;
      const nextDateTo = view.dateTo || initialTo;
      const nextComparisonMode = view.comparisonMode ?? false;
      const nextComparisonDateFrom = view.comparisonDateFrom || "";
      const nextComparisonDateTo = view.comparisonDateTo || "";
      const nextFilterState = cloneFilterState(view.filterState);
      const nextFlags = cloneFlags(view.flagFilters);

      setPage(1);
      setDraftDateFrom(nextDateFrom);
      setDraftDateTo(nextDateTo);
      setAppliedDateFrom(nextDateFrom);
      setAppliedDateTo(nextDateTo);
      setDraftFilterState(nextFilterState);
      setFilterState(nextFilterState);
      setDraftComparisonMode(nextComparisonMode);
      setComparisonModeApplied(nextComparisonMode);
      setDraftComparisonDateFrom(nextComparisonDateFrom);
      setDraftComparisonDateTo(nextComparisonDateTo);
      setAppliedComparisonDateFrom(nextComparisonDateFrom);
      setAppliedComparisonDateTo(nextComparisonDateTo);
      setFlagFilters(nextFlags);
      setSortBy(view.sortBy || "data");
      setSortDir(view.sortDir || "desc");
      setIncluirSemComissao(view.incluirSemComissao ?? true);
    },
    [initialFrom, initialTo]
  );

  const handleSort = useCallback(
    (col: SortBy) => {
      setPage(1);
      if (sortBy === col) {
        setSortDir(d => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(col);
        setSortDir("desc");
      }
    },
    [sortBy]
  );

  const toggleFlag = useCallback((key: keyof FlagFilters) => {
    console.info("[GestaoLog] Toggle flag de qualidade", { key });
    setPage(1);
    setFlagFilters(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setComparisonMode = useCallback((value: boolean) => {
    console.info("[GestaoLog] Comparação de período atualizada (rascunho)", {
      value,
    });
    setDraftComparisonMode(value);
  }, []);

  const setComparisonDateFrom = useCallback((value: string) => {
    console.info(
      "[GestaoLog] Data inicial de comparação atualizada (rascunho)",
      { value }
    );
    setDraftComparisonDateFrom(value);
  }, []);

  const setComparisonDateTo = useCallback((value: string) => {
    console.info("[GestaoLog] Data final de comparação atualizada (rascunho)", {
      value,
    });
    setDraftComparisonDateTo(value);
  }, []);

  const applyComparisonPreset = useCallback(
    (mode: ComparisonPreset) => {
      if (mode === "custom") return;

      const normalizedMain = normalizeDateRange(draftDateFrom, draftDateTo);
      if (!normalizedMain) return;

      const nextRange = buildComparisonRange(
        mode,
        normalizedMain.dateFrom,
        normalizedMain.dateTo
      );
      setDraftComparisonDateFrom(nextRange.comparisonDateFrom);
      setDraftComparisonDateTo(nextRange.comparisonDateTo);
    },
    [draftDateFrom, draftDateTo]
  );

  const applyAllFilters = useCallback(() => {
    const normalizedMain = normalizeDateRange(draftDateFrom, draftDateTo);
    const effectiveMain = normalizedMain || {
      dateFrom: initialFrom,
      dateTo: initialTo,
    };

    console.info("[GestaoLog] Aplicando filtros (commit)", {
      dateFrom: effectiveMain.dateFrom,
      dateTo: effectiveMain.dateTo,
      draftFilterState,
      flagFilters,
      comparison: draftComparisonMode
        ? {
            dateFrom: draftComparisonDateFrom,
            dateTo: draftComparisonDateTo,
          }
        : null,
    });

    setPage(1);
    setAppliedDateFrom(effectiveMain.dateFrom);
    setAppliedDateTo(effectiveMain.dateTo);
    setFilterState(draftFilterState);

    const normalizedComparison = normalizeDateRange(
      draftComparisonDateFrom,
      draftComparisonDateTo
    );

    if (draftComparisonMode && normalizedComparison) {
      setComparisonModeApplied(true);
      setAppliedComparisonDateFrom(normalizedComparison.dateFrom);
      setAppliedComparisonDateTo(normalizedComparison.dateTo);
    } else {
      setComparisonModeApplied(false);
      setAppliedComparisonDateFrom("");
      setAppliedComparisonDateTo("");
    }

    return {
      dateFrom: effectiveMain.dateFrom,
      dateTo: effectiveMain.dateTo,
      comparison:
        draftComparisonMode && normalizedComparison
          ? {
              dateFrom: normalizedComparison.dateFrom,
              dateTo: normalizedComparison.dateTo,
            }
          : null,
    };
  }, [
    draftDateFrom,
    draftDateTo,
    draftFilterState,
    draftComparisonDateFrom,
    draftComparisonDateTo,
    draftComparisonMode,
    flagFilters,
    initialFrom,
    initialTo,
  ]);

  return {
    dateFrom: draftDateFrom,
    dateTo: draftDateTo,
    setDateFrom,
    setDateTo,
    filterState,
    draftFilterState,
    applyFilter,
    toggleDraftFilter,
    clearFilters,
    applyAllFilters,
    filters,
    comparisonFilters,
    comparisonMode: draftComparisonMode,
    comparisonModeApplied,
    setComparisonMode,
    comparisonDateFrom: draftComparisonDateFrom,
    comparisonDateTo: draftComparisonDateTo,
    setComparisonDateFrom,
    setComparisonDateTo,
    applyComparisonPreset,
    flagFilters,
    setFlagFilters,
    toggleFlag,
    sortBy,
    sortDir,
    handleSort,
    setSortBy,
    setSortDir,
    incluirSemComissao,
    setIncluirSemComissao,
    page,
    setPage,
    applyViewState,
  };
}
