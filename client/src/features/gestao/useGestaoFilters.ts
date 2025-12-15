import { useCallback, useMemo, useState } from "react";
import { endOfMonthISO, startOfMonthISO } from "./utils";

export type SortBy = "data" | "comissao" | "liquido" | "takeRate";
export type SortDir = "asc" | "desc";

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

export function useGestaoFilters(now = new Date()) {
  const initialFrom = startOfMonthISO(now);
  const initialTo = endOfMonthISO(now);

  const [draftDateFrom, setDraftDateFrom] = useState(initialFrom);
  const [draftDateTo, setDraftDateTo] = useState(initialTo);
  const [appliedDateFrom, setAppliedDateFrom] = useState(initialFrom);
  const [appliedDateTo, setAppliedDateTo] = useState(initialTo);
  const [filterState, setFilterState] = useState<FilterState>(initialFilterState);
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

  const applyFilter = useCallback((partial: Partial<FilterState>) => {
    console.info("[GestaoLog] Aplicando filtro pontual", partial);
    setPage(1);
    setFilterState((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearFilters = useCallback(() => {
    const newDateFrom = startOfMonthISO(now);
    const newDateTo = endOfMonthISO(now);
    console.info("[GestaoLog] Reset de filtros solicitado", {
      newDateFrom,
      newDateTo,
    });
    setPage(1);
    setFilterState(initialFilterState);
    setFlagFilters(initialFlags);
    setIncluirSemComissao(true);
    setDraftDateFrom(newDateFrom);
    setDraftDateTo(newDateTo);
    setAppliedDateFrom(newDateFrom);
    setAppliedDateTo(newDateTo);
  }, [now]);

  const handleSort = useCallback(
    (col: SortBy) => {
      setPage(1);
      if (sortBy === col) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
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
    setFlagFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const applyAllFilters = useCallback(() => {
    const from = new Date(draftDateFrom);
    const to = new Date(draftDateTo);
    const needsSwap = from.getTime() > to.getTime();
    const effectiveFrom = needsSwap ? draftDateTo : draftDateFrom;
    const effectiveTo = needsSwap ? draftDateFrom : draftDateTo;
    console.info("[GestaoLog] Aplicando filtros (commit)", {
      dateFrom: effectiveFrom,
      dateTo: effectiveTo,
      filterState,
      flagFilters,
      swapped: needsSwap,
    });
    setPage(1);
    setAppliedDateFrom(effectiveFrom);
    setAppliedDateTo(effectiveTo);
    return { dateFrom: effectiveFrom, dateTo: effectiveTo };
  }, [draftDateFrom, draftDateTo, filterState, flagFilters]);

  return {
    dateFrom: draftDateFrom,
    dateTo: draftDateTo,
    setDateFrom,
    setDateTo,
    filterState,
    applyFilter,
    clearFilters,
    applyAllFilters,
    filters,
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
