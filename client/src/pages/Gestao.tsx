import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { ActiveFilters } from "@/features/gestao/components/ActiveFilters";
import { AlertsCard } from "@/features/gestao/components/AlertsCard";
import { executeGestaoAnalystAction } from "@/features/gestao/analystActions";
import { ClickableList } from "@/features/gestao/components/ClickableList";
import { DrilldownTable } from "@/features/gestao/components/DrilldownTable";
import { HealthPipelineSection } from "@/features/gestao/components/HealthPipelineSection";
import { FilterBar } from "@/features/gestao/components/FilterBar";
import { GestaoAnalystChat } from "@/features/gestao/components/GestaoAnalystChat";
import { LeversSection } from "@/features/gestao/components/LeversSection";
import { MixSection } from "@/features/gestao/components/MixSection";
import { PeriodKpisSection } from "@/features/gestao/components/PeriodKpisSection";
import { ExecutiveCockpit } from "@/features/gestao/components/ExecutiveCockpit";
import { ProductRankingList } from "@/features/gestao/components/ProductRankingList";
import { SalesHeatmap } from "@/features/gestao/components/SalesHeatmap";
import { SellerPerformanceTable } from "@/features/gestao/components/SellerPerformanceTable";
import {
  formatCurrency,
  formatPercent,
  type TimeseriesGranularity,
} from "@/features/gestao/utils";
import { useGestaoFilters } from "@/features/gestao/useGestaoFilters";
import type {
  GestaoSeriesVisibility,
  GestaoViewState,
} from "@/features/gestao/types";
import {
  GESTAO_VIEW_DEFAULTS,
  parseGestaoViewStateFromSearch,
} from "@/features/gestao/viewState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { skipToken } from "@tanstack/react-query";
import { useGestaoDerivedData } from "@/features/gestao/useGestaoDerivedData";
import { useGestaoViewManager } from "@/features/gestao/useGestaoViewManager";

type SyncStatus = {
  id: string;
  status: "pending" | "running" | "done";
  totalMonths: number;
  completedMonths: number;
  perMonth: Array<{
    mesInicio: string;
    mesFim: string;
    status: "done" | "error";
    fetched: number;
    upserted: number;
    unchanged: number;
    skipped: number;
    durationMs: number;
    warnings?: string | null;
  }>;
  startedAt: string | Date;
  finishedAt?: string | Date;
};

export default function Gestao() {
  const now = useMemo(() => new Date(), []);
  const initialViewState = useMemo<Partial<GestaoViewState>>(
    () =>
      typeof window !== "undefined"
        ? parseGestaoViewStateFromSearch(window.location.search)
        : {},
    []
  );
  const {
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    filterState,
    draftFilterState,
    applyFilter,
    toggleDraftFilter,
    clearFilters,
    filters,
    comparisonFilters,
    comparisonMode,
    comparisonModeApplied,
    setComparisonMode,
    comparisonDateFrom,
    comparisonDateTo,
    setComparisonDateFrom,
    setComparisonDateTo,
    applyComparisonPreset,
    flagFilters,
    applyAllFilters,
    toggleFlag,
    sortBy,
    sortDir,
    handleSort,
    incluirSemComissao,
    setIncluirSemComissao,
    page,
    setPage,
    applyViewState,
  } = useGestaoFilters(now, {
    initialState: {
      dateFrom: initialViewState.dateFrom,
      dateTo: initialViewState.dateTo,
      comparisonMode: initialViewState.comparisonMode,
      comparisonDateFrom: initialViewState.comparisonDateFrom,
      comparisonDateTo: initialViewState.comparisonDateTo,
      filterState: initialViewState.filterState,
      flagFilters: initialViewState.flagFilters,
      sortBy: initialViewState.sortBy,
      sortDir: initialViewState.sortDir,
      incluirSemComissao: initialViewState.incluirSemComissao,
    },
  });
  const hasGestaoCookie =
    typeof document !== "undefined"
      ? document.cookie.includes("gestao_access=1")
      : false;
  const [authed, setAuthed] = useState(hasGestaoCookie);
  const [password, setPassword] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [syncId, setSyncId] = useState<string | null>(null);
  const [lastSyncSummary, setLastSyncSummary] = useState<{
    fetched: number;
    upserted: number;
    unchanged: number;
    skipped: number;
    warnings: number;
  } | null>(null);

  const [hasFetched, setHasFetched] = useState(false);
  const [granularity, setGranularity] = useState<TimeseriesGranularity>(
    initialViewState.granularity || "day"
  );
  const [seriesVisibility, setSeriesVisibility] =
    useState<GestaoSeriesVisibility>(
      initialViewState.seriesVisibility || GESTAO_VIEW_DEFAULTS.seriesVisibility
    );

  const resumoQuery = trpc.gestao.getResumo.useQuery(filters, {
    enabled: authed && hasFetched,
    retry: false,
  });

  const comparisonQuery = trpc.gestao.getResumo.useQuery(
    comparisonFilters ?? skipToken,
    {
      enabled:
        authed &&
        hasFetched &&
        comparisonModeApplied &&
        Boolean(comparisonFilters),
      retry: false,
    }
  );

  const drilldownQuery = trpc.gestao.getDrilldown.useQuery(
    {
      ...filters,
      page,
      pageSize: 20,
      somenteComissaoCalculada: flagFilters.comissaoCalculada,
      somenteLiquidoFallback: flagFilters.liquidoFallback,
      somenteInconsistenciaData: flagFilters.inconsistenciaData,
      somenteSemComissao: flagFilters.semComissao,
      sortBy,
      sortDir,
    },
    {
      enabled: authed && hasFetched,
      retry: false,
    }
  );

  const exportQuery = trpc.gestao.exportCSV.useQuery(filters, {
    enabled: false,
  });
  const healthQuery = trpc.gestao.getHealth.useQuery(
    {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      etapaPipeline: filters.etapaPipeline,
      vendedorNome: filters.vendedorNome,
      produto: filters.produto,
      tipoOperacao: filters.tipoOperacao,
    },
    { enabled: authed && hasFetched }
  );
  const syncMutation = trpc.gestao.syncRange.useMutation({
    onError: err => {
      console.error("[GestaoLog] Falha ao sincronizar Zoho", err);
      toast.error("Falha ao sincronizar com Zoho");
    },
    onSuccess: data => {
      setSyncId(data.syncId);
      setLastSyncSummary(null);
    },
  });
  const setMetaMutation = trpc.gestao.setMetaComissao.useMutation({
    onSuccess: async () => {
      await resumoQuery.refetch();
      toast.success("Meta de comissão atualizada");
    },
    onError: () => toast.error("Falha ao atualizar meta"),
  });

  const authMutation = trpc.gestao.auth.useMutation({
    onSuccess: () => {
      console.info("[GestaoLog] Autorização gestão concluída com sucesso");
      setAuthed(true);
      setHasFetched(false);
      toast.success("Acesso liberado");
    },
    onError: () => {
      console.warn("[GestaoLog] Falha de autenticação gestão");
      toast.error("Senha inválida");
    },
  });

  useEffect(() => {
    if (resumoQuery.data) setAuthed(true);
  }, [resumoQuery.data]);

  const {
    availableProducts,
    availableSellers,
    comparisonMetricDeltas,
    deltas,
    flagCounts,
    operationData,
    productData,
    productOperationMap,
    productsSorted,
    rankEvolution,
    sellerDeltas,
    sellersSorted,
    stageData,
    timeseriesData,
  } = useGestaoDerivedData({
    resumoData: resumoQuery.data,
    comparisonData: comparisonQuery.data,
    healthData: healthQuery.data,
    incluirSemComissao,
    granularity,
    comparisonModeApplied,
  });

  const handleStageClick = (etapa: string) => {
    console.info("[GestaoLog] Clique em etapa de pipeline", { etapa });
    applyFilter({
      etapaPipeline: filterState.etapaPipeline.includes(etapa)
        ? filterState.etapaPipeline
        : [etapa],
    });
  };
  const handleProductClick = (produto: string) => {
    console.info("[GestaoLog] Clique em produto", { produto });
    applyFilter({
      produto: filterState.produto.includes(produto)
        ? filterState.produto
        : [produto],
    });
  };
  const handleOperationClick = (tipoOperacao: string) => {
    console.info("[GestaoLog] Clique em tipo de operação", { tipoOperacao });
    applyFilter({
      tipoOperacao: filterState.tipoOperacao.includes(tipoOperacao)
        ? filterState.tipoOperacao
        : [tipoOperacao],
    });
  };
  const handleProductOperationClick = (
    produto: string,
    tipoOperacao: string
  ) => {
    console.info("[GestaoLog] Clique em produto + operação", {
      produto,
      tipoOperacao,
    });
    applyFilter({
      produto: filterState.produto.includes(produto)
        ? filterState.produto
        : [produto],
      tipoOperacao: filterState.tipoOperacao.includes(tipoOperacao)
        ? filterState.tipoOperacao
        : [tipoOperacao],
    });
  };
  const handleSellerClick = (vendedor: string) => {
    console.info("[GestaoLog] Clique em vendedor", { vendedor });
    applyFilter({
      vendedorNome: filterState.vendedorNome.includes(vendedor)
        ? filterState.vendedorNome
        : [vendedor],
    });
  };

  const handleLegendToggle = (dataKey?: string) => {
    if (!dataKey) return;
    const keyMap: Record<string, "comissao" | "liquido" | "liquidoSem"> = {
      comissaoPlot: "comissao",
      comissao: "comissao",
      liquidoPlot: "liquido",
      liquido: "liquido",
      liquidoSem: "liquidoSem",
    };
    const target = keyMap[dataKey];
    if (!target) return;
    setSeriesVisibility(prev => ({ ...prev, [target]: !prev[target] }));
  };

  const baseViewState = useMemo<Omit<GestaoViewState, "activeViewId">>(
    () => ({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      comparisonMode: comparisonModeApplied,
      comparisonDateFrom: comparisonModeApplied
        ? comparisonFilters?.dateFrom || ""
        : "",
      comparisonDateTo: comparisonModeApplied
        ? comparisonFilters?.dateTo || ""
        : "",
      filterState,
      flagFilters,
      sortBy,
      sortDir,
      incluirSemComissao,
      granularity,
      seriesVisibility,
    }),
    [
      comparisonFilters,
      comparisonModeApplied,
      filterState,
      filters.dateFrom,
      filters.dateTo,
      flagFilters,
      granularity,
      incluirSemComissao,
      seriesVisibility,
      sortBy,
      sortDir,
    ]
  );

  const syncForViewState = async (viewState: {
    dateFrom: string;
    dateTo: string;
    comparisonMode: boolean;
    comparisonDateFrom: string;
    comparisonDateTo: string;
  }) => {
    await syncMutation.mutateAsync({
      dateFrom: viewState.dateFrom,
      dateTo: viewState.dateTo,
      additionalRanges:
        viewState.comparisonMode &&
        viewState.comparisonDateFrom &&
        viewState.comparisonDateTo
          ? [
              {
                dateFrom: viewState.comparisonDateFrom,
                dateTo: viewState.comparisonDateTo,
              },
            ]
          : undefined,
    });
  };

  const {
    activeViewId,
    allSavedViews,
    applySavedView,
    applySavedViewLocally,
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
  } = useGestaoViewManager({
    baseViewState,
    initialActiveViewId: initialViewState.activeViewId || null,
    applyViewState,
    clearFilters,
    setGranularity,
    setSeriesVisibility,
    setHasFetched,
    syncForViewState,
  });

  const chatViewState = useMemo<GestaoViewState>(
    () => ({
      ...baseViewState,
      activeViewId,
    }),
    [activeViewId, baseViewState]
  );

  const [metaInput, setMetaInput] = useState("");

  useEffect(() => {
    if (resumoQuery.data?.cards.metaComissaoMensal !== undefined) {
      setMetaInput(resumoQuery.data.cards.metaComissaoMensal.toString());
    }
  }, [resumoQuery.data?.cards.metaComissaoMensal]);

  const handleMetaSave = () => {
    if (!resumoQuery.data?.cards.metaEditavel) {
      toast.error(
        "Para editar a meta mensal, use um recorte que fique dentro de um único mês."
      );
      return;
    }

    const value = Number.parseFloat(metaInput);
    if (Number.isNaN(value)) {
      toast.error("Valor inválido");
      return;
    }

    const mes = resumoQuery.data?.cards.metaMesReferencia;
    if (!mes) {
      toast.error("Mês de referência indisponível");
      return;
    }

    setMetaMutation.mutate({
      mes,
      valor: value,
    });
  };

  const handleApplyFilters = async () => {
    console.info("[GestaoLog] Botão aplicar filtros acionado", {
      draftDateFrom: dateFrom,
      draftDateTo: dateTo,
      filtrosRascunho: draftFilterState,
      flags: flagFilters,
    });
    setIsApplying(true);
    const applied = applyAllFilters();
    setHasFetched(true);
    try {
      await syncMutation.mutateAsync({
        dateFrom: applied.dateFrom,
        dateTo: applied.dateTo,
        additionalRanges: applied.comparison ? [applied.comparison] : undefined,
      });
      toast.success("Sincronização iniciada. Acompanhe o progresso.");
    } catch (err) {
      console.error("[GestaoLog] Erro ao aplicar filtros/sincronizar", err);
      toast.error("Erro ao aplicar filtros");
    } finally {
      setIsApplying(false);
    }
  };

  const handleRefresh = async () => {
    console.info("[GestaoLog] Botão atualizar dados acionado", {
      filtrosAplicados: filters,
    });
    setHasFetched(true);
    try {
      await syncMutation.mutateAsync({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        additionalRanges:
          comparisonModeApplied && comparisonFilters
            ? [
                {
                  dateFrom: comparisonFilters.dateFrom,
                  dateTo: comparisonFilters.dateTo,
                },
              ]
            : undefined,
      });
      toast.success("Sincronização iniciada. Acompanhe o progresso.");
    } catch (err) {
      console.error("[GestaoLog] Erro ao atualizar dados", err);
      toast.error("Erro ao atualizar dados");
    }
  };

  const handleExport = async () => {
    console.info("[GestaoLog] Exportação CSV iniciada", {
      filtrosAplicados: filters,
    });
    const res = await exportQuery.refetch();
    if (!res.data?.csv) return;
    const blob = new Blob([res.data.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gestao_${filters.dateFrom}_a_${filters.dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    console.info("[GestaoLog] Exportação CSV concluída");
  };

  const handleAnalystAction = async (
    action: Parameters<typeof executeGestaoAnalystAction>[0]["action"]
  ) => {
    executeGestaoAnalystAction({
      action,
      currentViewState: chatViewState,
      applyFilter,
      applyViewState,
      setGranularity,
      setIncluirSemComissao,
      availableViews: allSavedViews,
      applySavedViewLocally,
    });
  };

  const syncStatusQuery = trpc.gestao.getSyncStatus.useQuery(
    syncId ? { syncId } : skipToken,
    {
      refetchInterval: data => {
        const status = (data as unknown as SyncStatus | undefined)?.status;
        return status === "done" ? false : 1500;
      },
    }
  );

  const statusData = syncStatusQuery.data as unknown as SyncStatus | undefined;

  const isFetchingData =
    hasFetched &&
    (isApplying ||
      resumoQuery.isFetching ||
      comparisonQuery.isFetching ||
      drilldownQuery.isFetching ||
      healthQuery.isFetching ||
      syncMutation.isPending ||
      (statusData && statusData.status !== "done"));

  useEffect(() => {
    const data = syncStatusQuery.data as unknown as SyncStatus | undefined;
    if (!data) return;
    if (data.status === "done") {
      const summary = data.perMonth.reduce(
        (acc, cur) => {
          acc.fetched += cur.fetched ?? 0;
          acc.upserted += cur.upserted ?? 0;
          acc.unchanged += cur.unchanged ?? 0;
          acc.skipped += cur.skipped ?? 0;
          if (cur.warnings) acc.warnings += 1;
          return acc;
        },
        { fetched: 0, upserted: 0, unchanged: 0, skipped: 0, warnings: 0 }
      );
      setLastSyncSummary(summary);
      setSyncId(null);
      void Promise.all([
        resumoQuery.refetch(),
        comparisonModeApplied && comparisonFilters
          ? comparisonQuery.refetch()
          : Promise.resolve(),
        drilldownQuery.refetch(),
        healthQuery.refetch(),
      ]);
    }
  }, [
    syncStatusQuery.data,
    comparisonModeApplied,
    comparisonFilters,
    comparisonQuery,
    drilldownQuery,
    healthQuery,
    resumoQuery,
  ]);

  if (!authed) {
    return (
      <div className="page-shell">
        <div className="page-content flex min-h-screen items-center justify-center px-4">
          <Card className="panel-card-strong w-full max-w-md">
            <CardHeader>
              <CardTitle>Acesso Gestão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Insira a senha fixa para liberar a visualização dos KPIs de
                Gestão.
              </p>
              <Input
                type="password"
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                placeholder="Senha"
              />
              <Button
                className="w-full"
                onClick={() => authMutation.mutate({ password })}
                disabled={authMutation.isPending || !password}
              >
                {authMutation.isPending ? "Validando..." : "Entrar"}
              </Button>
              {authMutation.error && (
                <p className="text-sm text-red-400">
                  Erro: {authMutation.error.message}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-content page-stack px-4">
        <FilterBar
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          incluirSemComissao={incluirSemComissao}
          onToggleSemComissao={() => setIncluirSemComissao(v => !v)}
          onRefresh={handleRefresh}
          isRefreshing={syncMutation.isPending && !isApplying}
          isApplying={isApplying}
          onApply={handleApplyFilters}
          onExport={handleExport}
          onClear={() => {
            clearFilters();
            clearActiveView();
          }}
          isExporting={exportQuery.isFetching}
          comparisonMode={comparisonMode}
          onComparisonModeChange={setComparisonMode}
          comparisonDateFrom={comparisonDateFrom}
          comparisonDateTo={comparisonDateTo}
          onComparisonDateFromChange={setComparisonDateFrom}
          onComparisonDateToChange={setComparisonDateTo}
          onComparisonPreset={applyComparisonPreset}
          sellerOptions={availableSellers}
          productOptions={availableProducts}
          selectedSellers={draftFilterState.vendedorNome}
          selectedProducts={draftFilterState.produto}
          onToggleSeller={value => toggleDraftFilter("vendedorNome", value)}
          onToggleProduct={value => toggleDraftFilter("produto", value)}
          freshness={resumoQuery.data?.freshness ?? null}
          dataQuality={resumoQuery.data?.dataQuality ?? null}
          businessStatus={resumoQuery.data?.businessStatus ?? null}
          presetViews={presetViews}
          customViews={customViews}
          activeViewId={activeViewId}
          onApplySavedView={view => {
            void applySavedView(view);
          }}
          onSaveView={handleSaveView}
          onRenameView={handleRenameView}
          onDuplicateView={handleDuplicateView}
          onDeleteView={handleDeleteView}
          onResetView={handleResetView}
          onRestoreLastView={() => {
            void handleRestoreLastView();
          }}
          lastViewName={lastViewName}
        />

        <div className="page-stack pt-2">
          <ActiveFilters filterState={filterState} onRemove={applyFilter} />

          {isFetchingData && (
            <Card className="panel-card">
              <CardContent className="flex items-center gap-3 text-foreground/80 py-3">
                <Spinner className="h-4 w-4 text-primary" />
                <div className="text-sm">
                  {isApplying || syncMutation.isPending
                    ? "Sincronizando dados com Zoho para o período selecionado..."
                    : "Preparando indicadores, aguarde..."}
                </div>
              </CardContent>
            </Card>
          )}

          {!hasFetched && (
            <Card className="panel-card">
              <CardHeader>
                <CardTitle className="text-base">
                  Nenhum dado carregado
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Selecione o período desejado e clique em "Aplicar filtros" para
                buscar os indicadores.
              </CardContent>
            </Card>
          )}

          {hasFetched && resumoQuery.data && !isFetchingData && (
            <>
              <ExecutiveCockpit
                businessStatus={resumoQuery.data.businessStatus}
                metrics={resumoQuery.data.executiveMetrics}
                comparisonEnabled={comparisonModeApplied}
              />

              <PeriodKpisSection
                cards={resumoQuery.data.cards}
                comparisonMetricDeltas={comparisonMetricDeltas}
                comparisonModeApplied={comparisonModeApplied}
                deltas={deltas}
                metaInput={metaInput}
                onMetaInputChange={setMetaInput}
                onMetaSave={handleMetaSave}
                isSavingMeta={setMetaMutation.isPending}
              />

              <Separator className="bg-border/70" />

              <section className="page-section">
                <div className="page-section-header">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground section-heading">
                      Diagnóstico
                    </h2>
                    <p className="page-section-copy">
                      Produção monetizada e pipeline operacional por tempo, mix,
                      vendedoras e alavancas de melhoria.
                    </p>
                  </div>
                </div>

                <HealthPipelineSection
                  timeseriesData={timeseriesData}
                  stageData={stageData}
                  seriesVisibility={seriesVisibility}
                  onLegendToggle={handleLegendToggle}
                  necessarioPorDia={resumoQuery.data.cards.necessarioPorDia}
                  granularity={granularity}
                  onGranularityChange={setGranularity}
                  onStageClick={handleStageClick}
                  onClearFilters={clearFilters}
                />

                <SalesHeatmap
                  data={resumoQuery.data.timeseries}
                  dateFrom={filters.dateFrom}
                  dateTo={filters.dateTo}
                />

                <LeversSection
                  bySeller={resumoQuery.data.bySeller}
                  byProduct={resumoQuery.data.byProduct}
                  byProductOperation={resumoQuery.data.byProductOperation}
                  filterState={filterState}
                  onSellerClick={handleSellerClick}
                  onProductOperationClick={handleProductOperationClick}
                  onProductClick={handleProductClick}
                />

                <SellerPerformanceTable
                  rows={resumoQuery.data.bySeller}
                  incluirSemComissao={incluirSemComissao}
                  filterState={filterState}
                  onSellerClick={handleSellerClick}
                  sellerDeltas={sellerDeltas}
                  rankEvolution={rankEvolution}
                />

                <MixSection
                  productData={productData}
                  operationData={operationData}
                  seriesVisibility={seriesVisibility}
                  onLegendToggle={handleLegendToggle}
                  onProductClick={handleProductClick}
                  onOperationClick={handleOperationClick}
                  onClearFilters={clearFilters}
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <ClickableList
                    title="Por Etapa"
                    rows={resumoQuery.data.byStage.map(b => ({
                      label: b.etapa,
                      value: formatCurrency(b.comissao),
                      extra: `${b.count} | ${formatPercent(b.takeRate)}`,
                      active: filterState.etapaPipeline.includes(b.etapa),
                      onClick: () =>
                        applyFilter({
                          etapaPipeline: filterState.etapaPipeline.includes(
                            b.etapa
                          )
                            ? filterState.etapaPipeline
                            : [b.etapa],
                        }),
                    }))}
                  />
                  <ClickableList
                    title="Por Vendedor"
                    rows={sellersSorted.map(b => ({
                      label: b.vendedor,
                      value: formatCurrency(b.comissao),
                      extra: `${b.count} | ${formatPercent(b.takeRate)}`,
                      active: filterState.vendedorNome.includes(b.vendedor),
                      onClick: () =>
                        applyFilter({
                          vendedorNome: filterState.vendedorNome.includes(
                            b.vendedor
                          )
                            ? filterState.vendedorNome
                            : [b.vendedor],
                        }),
                    }))}
                  />
                  <ProductRankingList
                    title="Por Produto"
                    rows={productsSorted}
                    operationsByProduct={productOperationMap}
                    activeProducts={filterState.produto}
                    activeOperations={filterState.tipoOperacao}
                    onProductClick={handleProductClick}
                    onOperationClick={handleProductOperationClick}
                  />
                </div>
              </section>

              <Separator className="bg-border/70" />

              <section className="page-section">
                <div className="page-section-header">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground section-heading">
                      Auditoria e Rastreamento
                    </h2>
                    <p className="page-section-copy">
                      Alertas automáticos, progresso de sincronização e
                      rastreabilidade detalhada do recorte.
                    </p>
                  </div>
                </div>

                <AlertsCard
                  alerts={resumoQuery.data.alerts}
                  filterState={filterState}
                  onFilter={applyFilter}
                  onRefresh={handleRefresh}
                />

                {!isApplying && !syncMutation.isPending && lastSyncSummary && (
                  <Card className="panel-card">
                    <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3 text-sm">
                      <div className="font-semibold text-foreground">
                        Última sincronização
                      </div>
                      <div className="text-muted-foreground">
                        Buscados:{" "}
                        <span className="text-foreground font-medium">
                          {lastSyncSummary.fetched}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        Inseridos:{" "}
                        <span className="text-foreground font-medium">
                          {lastSyncSummary.upserted}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        Iguais:{" "}
                        <span className="text-foreground font-medium">
                          {lastSyncSummary.unchanged}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        Pulados:{" "}
                        <span className="text-foreground font-medium">
                          {lastSyncSummary.skipped}
                        </span>
                      </div>
                      {lastSyncSummary.warnings > 0 && (
                        <div className="text-amber-400 font-medium">
                          {lastSyncSummary.warnings} aviso
                          {lastSyncSummary.warnings > 1 ? "s" : ""}
                        </div>
                      )}
                      {syncStatusQuery.data?.status !== "done" && (
                        <div className="text-muted-foreground">
                          Aguardando conclusão...
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {syncStatusQuery.data?.perMonth &&
                  syncStatusQuery.data?.perMonth.length > 0 && (
                    <Card className="panel-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">
                          Progresso de sincronização por mês
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1.5 text-sm">
                        {syncStatusQuery.data.perMonth
                          .slice()
                          .sort((a, b) =>
                            a.mesInicio.localeCompare(b.mesInicio)
                          )
                          .map(m => (
                            <div
                              key={`${m.mesInicio}-${m.mesFim}`}
                              className="interactive-row flex items-center justify-between px-3 py-2"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-foreground">
                                  {m.mesInicio} → {m.mesFim}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {m.status === "done" ? "Concluído" : "Erro"} ·{" "}
                                  {m.fetched} buscados · {m.upserted} inseridos
                                </span>
                              </div>
                              <div
                                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  m.status === "done"
                                    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25"
                                    : "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25"
                                }`}
                              >
                                {m.status === "done" ? "OK" : "Aviso"}
                              </div>
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  )}

                <DrilldownTable
                  rows={drilldownQuery.data?.data ?? []}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                  flagFilters={flagFilters}
                  toggleFlag={toggleFlag}
                  flagCounts={flagCounts}
                  page={page}
                  onPrevPage={() => setPage(p => Math.max(1, p - 1))}
                  onNextPage={() => setPage(p => p + 1)}
                  onExport={handleExport}
                  takeRateBaseline={resumoQuery.data?.cards.takeRate}
                  isEmpty={(drilldownQuery.data?.data?.length ?? 0) === 0}
                  isExporting={exportQuery.isFetching}
                />
              </section>
            </>
          )}
        </div>

        {hasFetched && resumoQuery.data ? (
          <GestaoAnalystChat
            viewState={chatViewState}
            summary={resumoQuery.data}
            availableViews={allSavedViews}
            onAction={handleAnalystAction}
          />
        ) : null}
      </div>
    </div>
  );
}
