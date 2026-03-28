import { useCallback, useMemo, useState } from "react";
import { endOfMonthISO, startOfMonthISO } from "./utils";

export type SortBy = "data" | "comissao" | "liquido" | "takeRate";
export type SortDir = "asc" | "desc";
export type ComparisonPreset =
  | "prev_month"
  | "prev_week"
  | "prev_year"
  | "custom";

export type FilterState = {
  etapaPipeline: string[];
  vendedorNome: string[];
  produto: string[];
  tipoOperacao: string[];
};

export type FlagFilters = {
  comissaoCalculada: boolean;
  liquidoFallback: boolean;
  inconsistenciaData: boolean;
  semComissao: boolean;
};

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

function normalizeDateRange(dateFrom: string, dateTo: string) {
  const from = parseDateOnly(dateFrom);
  const to = parseDateOnly(dateTo);
  const hasBothDates = dateFrom.length >= 10 && dateTo.length >= 10;
  if (
    !hasBothDates ||
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime())
  ) {
    return null;
  }

  return from.getTime() <= to.getTime()
    ? { dateFrom, dateTo }
    : { dateFrom: dateTo, dateTo: dateFrom };
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftMonths(dateISO: string, months: number) {
  const date = parseDateOnly(dateISO);
  const targetMonthIndex = date.getMonth() + months;
  const lastDayOfTargetMonth = new Date(
    date.getFullYear(),
    targetMonthIndex + 1,
    0
  ).getDate();
  const target = new Date(
    date.getFullYear(),
    targetMonthIndex,
    Math.min(date.getDate(), lastDayOfTargetMonth)
  );
  return formatISO(target);
}

function shiftDays(dateISO: string, days: number) {
  const date = parseDateOnly(dateISO);
  const target = new Date(date);
  target.setDate(target.getDate() + days);
  return formatISO(target);
}

function shiftYears(dateISO: string, years: number) {
  const date = parseDateOnly(dateISO);
  const target = new Date(date);
  target.setFullYear(target.getFullYear() + years);
  return formatISO(target);
}

export function useGestaoFilters(now = new Date()) {
  const initialFrom = startOfMonthISO(now);
  const initialTo = endOfMonthISO(now);

  const [draftDateFrom, setDraftDateFrom] = useState(initialFrom);
  const [draftDateTo, setDraftDateTo] = useState(initialTo);
  const [appliedDateFrom, setAppliedDateFrom] = useState(initialFrom);
  const [appliedDateTo, setAppliedDateTo] = useState(initialTo);

  const [draftFilterState, setDraftFilterState] =
    useState<FilterState>(initialFilterState);
  const [filterState, setFilterState] =
    useState<FilterState>(initialFilterState);

  const [draftComparisonMode, setDraftComparisonMode] = useState(false);
  const [comparisonModeApplied, setComparisonModeApplied] = useState(false);
  const [draftComparisonDateFrom, setDraftComparisonDateFrom] = useState("");
  const [draftComparisonDateTo, setDraftComparisonDateTo] = useState("");
  const [appliedComparisonDateFrom, setAppliedComparisonDateFrom] =
    useState("");
  const [appliedComparisonDateTo, setAppliedComparisonDateTo] = useState("");

  const [flagFilters, setFlagFilters] = useState<FlagFilters>(initialFlags);
  const [sortBy, setSortBy] = useState<SortBy>("data");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [incluirSemComissao, setIncluirSemComissao] = useState(true);
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
    setDraftFilterState(initialFilterState);
    setFilterState(initialFilterState);
    setFlagFilters(initialFlags);
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

      if (mode === "prev_week") {
        setDraftComparisonDateFrom(shiftDays(normalizedMain.dateFrom, -7));
        setDraftComparisonDateTo(shiftDays(normalizedMain.dateTo, -7));
        return;
      }

      if (mode === "prev_month") {
        setDraftComparisonDateFrom(shiftMonths(normalizedMain.dateFrom, -1));
        setDraftComparisonDateTo(shiftMonths(normalizedMain.dateTo, -1));
        return;
      }

      if (mode === "prev_year") {
        setDraftComparisonDateFrom(shiftYears(normalizedMain.dateFrom, -1));
        setDraftComparisonDateTo(shiftYears(normalizedMain.dateTo, -1));
      }
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
  };
}
