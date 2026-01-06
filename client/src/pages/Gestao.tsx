import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ActiveFilters } from "@/features/gestao/components/ActiveFilters";
import { AlertsCard } from "@/features/gestao/components/AlertsCard";
import { ClickableList } from "@/features/gestao/components/ClickableList";
import { DrilldownTable } from "@/features/gestao/components/DrilldownTable";
import { HealthPipelineSection } from "@/features/gestao/components/HealthPipelineSection";
import { FilterBar } from "@/features/gestao/components/FilterBar";
import { LeversSection } from "@/features/gestao/components/LeversSection";
import { MetricCard } from "@/features/gestao/components/MetricCard";
import { MixSection } from "@/features/gestao/components/MixSection";
import { ProductRankingList } from "@/features/gestao/components/ProductRankingList";
import { SellerPerformanceTable } from "@/features/gestao/components/SellerPerformanceTable";
import { formatCurrency, formatPercent } from "@/features/gestao/utils";
import { useGestaoFilters } from "@/features/gestao/useGestaoFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { skipToken } from "@tanstack/react-query";

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
  const {
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    filterState,
    applyFilter,
    clearFilters,
    filters,
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
  } = useGestaoFilters(now);
  const hasGestaoCookie =
    typeof document !== "undefined" ? document.cookie.includes("gestao_access=1") : false;
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

  const resumoQuery = trpc.gestao.getResumo.useQuery(filters, {
    enabled: authed && hasFetched,
    retry: false,
  });

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

  const exportQuery = trpc.gestao.exportCSV.useQuery(filters, { enabled: false });
  const healthQuery = trpc.gestao.getHealth.useQuery({}, { enabled: authed && hasFetched });
  const syncMutation = trpc.gestao.syncRange.useMutation({
    onError: (err) => {
      console.error("[GestaoLog] Falha ao sincronizar Zoho", err);
      toast.error("Falha ao sincronizar com Zoho");
    },
    onSuccess: (data) => {
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

  const deltas = useMemo(() => {
    const ts = resumoQuery.data?.timeseries ?? [];
    if (ts.length === 0) return { comissao: 0, liquido: 0 };
    const sorted = [...ts].sort((a, b) => a.date.localeCompare(b.date));
    const sliceSum = (arr: typeof sorted, startIdx: number, endIdx: number, key: "comissao" | "liquido") =>
      arr.slice(startIdx, endIdx).reduce((acc, item) => acc + (item[key] ?? 0), 0);
    const last7Start = Math.max(0, sorted.length - 7);
    const prev7Start = Math.max(0, sorted.length - 14);
    const last7 = sliceSum(sorted, last7Start, sorted.length, "comissao");
    const prev7 = sliceSum(sorted, prev7Start, last7Start, "comissao");
    const last7Liq = sliceSum(sorted, last7Start, sorted.length, "liquido");
    const prev7Liq = sliceSum(sorted, prev7Start, last7Start, "liquido");
    const delta = prev7 > 0 ? (last7 - prev7) / prev7 : 0;
    const deltaLiq = prev7Liq > 0 ? (last7Liq - prev7Liq) / prev7Liq : 0;
    return { comissao: delta, liquido: deltaLiq };
  }, [resumoQuery.data?.timeseries]);

  const flagCounts = useMemo(() => {
    const total = healthQuery.data?.totalRegistros ?? 0;
    const calc = Math.round((healthQuery.data?.pctComissaoCalculada ?? 0) * total);
    const liq = Math.round((healthQuery.data?.pctLiquidoFallback ?? 0) * total);
    const dataInc = Math.round((healthQuery.data?.pctInconsistenciaData ?? 0) * total);
    return { calc, liq, dataInc };
  }, [healthQuery.data]);

  const handleStageClick = (etapa: string) => {
    console.info("[GestaoLog] Clique em etapa de pipeline", { etapa });
    applyFilter({
      etapaPipeline: filterState.etapaPipeline.includes(etapa) ? filterState.etapaPipeline : [etapa],
    });
  };
  const handleProductClick = (produto: string) => {
    console.info("[GestaoLog] Clique em produto", { produto });
    applyFilter({
      produto: filterState.produto.includes(produto) ? filterState.produto : [produto],
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
  const handleProductOperationClick = (produto: string, tipoOperacao: string) => {
    console.info("[GestaoLog] Clique em produto + operação", { produto, tipoOperacao });
    applyFilter({
      produto: filterState.produto.includes(produto) ? filterState.produto : [produto],
      tipoOperacao: filterState.tipoOperacao.includes(tipoOperacao)
        ? filterState.tipoOperacao
        : [tipoOperacao],
    });
  };
  const handleSellerClick = (vendedor: string) => {
    console.info("[GestaoLog] Clique em vendedor", { vendedor });
    applyFilter({
      vendedorNome: filterState.vendedorNome.includes(vendedor) ? filterState.vendedorNome : [vendedor],
    });
  };

  const timeseriesData = useMemo(() => {
    const ts = resumoQuery.data?.timeseries ?? [];
    return ts.map((t) => {
      const comissaoPlot =
        incluirSemComissao || t.comissaoComissionado === undefined
          ? t.comissao
          : t.comissaoComissionado;
      const liquidoPlot =
        incluirSemComissao || t.liquidoComissionado === undefined
          ? t.liquido
          : t.liquidoComissionado;
      return { ...t, comissaoPlot, liquidoPlot };
    });
  }, [resumoQuery.data?.timeseries, incluirSemComissao]);

  const stageData = useMemo(() => {
    const arr = resumoQuery.data?.byStage ?? [];
    return arr.map((item) => {
      const liquidoPlot = incluirSemComissao
        ? item.liquido
        : item.liquidoComissionado ?? item.liquido;
      const comissaoPlot = incluirSemComissao
        ? item.comissao
        : item.comissaoComissionado ?? item.comissao;
      const liquidoSem = incluirSemComissao
        ? Math.max(0, item.liquido - (item.liquidoComissionado ?? item.liquido))
        : 0;
      return { ...item, liquidoPlot, comissaoPlot, liquidoSem };
    });
  }, [resumoQuery.data?.byStage, incluirSemComissao]);

  const productData = useMemo(() => {
    const arr = resumoQuery.data?.byProduct ?? [];
    return arr.map((item) => {
      const liquidoPlot = incluirSemComissao
        ? item.liquido
        : item.liquidoComissionado ?? item.liquido;
      const comissaoPlot = incluirSemComissao
        ? item.comissao
        : item.comissaoComissionado ?? item.comissao;
      const liquidoSem = incluirSemComissao
        ? Math.max(0, item.liquido - (item.liquidoComissionado ?? item.liquido))
        : 0;
      return { ...item, liquidoPlot, comissaoPlot, liquidoSem };
    });
  }, [resumoQuery.data?.byProduct, incluirSemComissao]);

  const operationData = useMemo(() => {
    const arr = resumoQuery.data?.byOperationType ?? [];
    return arr.map((item) => {
      const liquidoPlot = incluirSemComissao
        ? item.liquido
        : item.liquidoComissionado ?? item.liquido;
      const comissaoPlot = incluirSemComissao
        ? item.comissao
        : item.comissaoComissionado ?? item.comissao;
      const liquidoSem = incluirSemComissao
        ? Math.max(0, item.liquido - (item.liquidoComissionado ?? item.liquido))
        : 0;
      return { ...item, liquidoPlot, comissaoPlot, liquidoSem };
    });
  }, [resumoQuery.data?.byOperationType, incluirSemComissao]);

  const sellersSorted = useMemo(
    () => (resumoQuery.data?.bySeller ?? []).slice().sort((a, b) => b.comissao - a.comissao),
    [resumoQuery.data?.bySeller]
  );

  const productsSorted = useMemo(
    () => (resumoQuery.data?.byProduct ?? []).slice().sort((a, b) => b.comissao - a.comissao),
    [resumoQuery.data?.byProduct]
  );

  const productOperationMap = useMemo(() => {
    const arr = resumoQuery.data?.byProductOperation ?? [];
    const map = new Map<string, Array<any>>();
    arr.forEach((item: any) => {
      map.set(item.produto, item.operations ?? []);
    });
    return map;
  }, [resumoQuery.data?.byProductOperation]);

  const [seriesVisibility, setSeriesVisibility] = useState<{
    comissao: boolean;
    liquido: boolean;
    liquidoSem: boolean;
  }>({
    comissao: true,
    liquido: true,
    liquidoSem: true,
  });

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
    setSeriesVisibility((prev) => ({ ...prev, [target]: !prev[target] }));
  };

  const [metaInput, setMetaInput] = useState("");

  useEffect(() => {
    if (resumoQuery.data?.cards.metaComissao !== undefined) {
      setMetaInput(resumoQuery.data.cards.metaComissao.toString());
    }
  }, [resumoQuery.data?.cards.metaComissao]);

  const handleApplyFilters = async () => {
    console.info("[GestaoLog] Botão aplicar filtros acionado", {
      draftDateFrom: dateFrom,
      draftDateTo: dateTo,
      filtrosRascunho: filters,
      flags: flagFilters,
    });
    setIsApplying(true);
    const applied = applyAllFilters();
    setHasFetched(true);
    try {
      await syncMutation.mutateAsync({ dateFrom: applied.dateFrom, dateTo: applied.dateTo });
      toast.success("Sincronização iniciada. Acompanhe o progresso.");
    } catch (err) {
      console.error("[GestaoLog] Erro ao aplicar filtros/sincronizar", err);
      toast.error("Erro ao aplicar filtros");
    } finally {
      setIsApplying(false);
    }
  };

  const handleRefresh = async () => {
    console.info("[GestaoLog] Botão atualizar dados acionado", { filtrosAplicados: filters });
    setHasFetched(true);
    try {
      await syncMutation.mutateAsync({ dateFrom: filters.dateFrom, dateTo: filters.dateTo });
      toast.success("Sincronização iniciada. Acompanhe o progresso.");
    } catch (err) {
      console.error("[GestaoLog] Erro ao atualizar dados", err);
      toast.error("Erro ao atualizar dados");
    }
  };

  const handleExport = async () => {
    console.info("[GestaoLog] Exportação CSV iniciada", { filtrosAplicados: filters });
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

  const syncStatusQuery = trpc.gestao.getSyncStatus.useQuery(syncId ? { syncId } : skipToken, {
    refetchInterval: (data) => {
      const status = (data as unknown as SyncStatus | undefined)?.status;
      return status === "done" ? false : 1500;
    },
  });

  const statusData = syncStatusQuery.data as unknown as SyncStatus | undefined;

  const isLoading = resumoQuery.isLoading || drilldownQuery.isLoading;
  const isFetchingData =
    hasFetched &&
    (isApplying ||
      resumoQuery.isFetching ||
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
      void Promise.all([resumoQuery.refetch(), drilldownQuery.refetch(), healthQuery.refetch()]);
    }
  }, [syncStatusQuery.data, drilldownQuery, healthQuery, resumoQuery]);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white px-4">
        <Card className="w-full max-w-md bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle>Acesso Gestão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-300">
              Insira a senha fixa para liberar a visualização dos KPIs de Gestão.
            </p>
            <Input
              type="password"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
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
              <p className="text-sm text-red-400">Erro: {authMutation.error.message}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white px-4 py-6 space-y-6">
      <FilterBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        incluirSemComissao={incluirSemComissao}
        onToggleSemComissao={() => setIncluirSemComissao((v) => !v)}
        onRefresh={handleRefresh}
        isRefreshing={syncMutation.isPending && !isApplying}
        isApplying={isApplying}
        onApply={handleApplyFilters}
        onExport={handleExport}
        onClear={clearFilters}
        isExporting={exportQuery.isFetching}
      />

      <ActiveFilters filterState={filterState} onRemove={applyFilter} />

      {(isApplying || syncMutation.isPending || syncStatusQuery.isFetching) && (
        <Card className="bg-slate-950 border-slate-800">
          <CardContent className="flex items-center gap-3 text-slate-200 py-3">
            <Spinner className="h-4 w-4" />
            <div className="text-sm">
              Sincronizando dados com Zoho para o período selecionado. Aguarde para ver os indicadores atualizados.
            </div>
          </CardContent>
        </Card>
      )}

      {!isApplying && !syncMutation.isPending && lastSyncSummary && (
        <Card className="bg-slate-950 border-slate-800">
          <CardContent className="flex flex-wrap items-center gap-4 py-3 text-sm text-slate-200">
            <div className="font-semibold">Última sincronização</div>
            <div>Buscados: {lastSyncSummary.fetched}</div>
            <div>Inseridos: {lastSyncSummary.upserted}</div>
            <div>Iguais: {lastSyncSummary.unchanged}</div>
            <div>Pulados: {lastSyncSummary.skipped}</div>
            {lastSyncSummary.warnings > 0 && (
              <div className="text-amber-300">Avisos: {lastSyncSummary.warnings}</div>
            )}
            {syncStatusQuery.data?.status !== "done" && (
              <div className="text-slate-400">Aguardando conclusão...</div>
            )}
          </CardContent>
        </Card>
      )}

      {syncStatusQuery.data?.perMonth && syncStatusQuery.data?.perMonth.length > 0 && (
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle>Progresso por mês</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {syncStatusQuery.data.perMonth
              .slice()
              .sort((a, b) => a.mesInicio.localeCompare(b.mesInicio))
              .map((m) => (
                <div
                  key={`${m.mesInicio}-${m.mesFim}`}
                  className="flex items-center justify-between rounded border border-slate-800 bg-slate-900 px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{m.mesInicio} → {m.mesFim}</span>
                    <span className="text-xs text-slate-400">
                      {m.status === "done" ? "Concluído" : "Erro"} · {m.fetched} buscados · {m.upserted} inseridos
                    </span>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${m.status === "done" ? "bg-emerald-900 text-emerald-200" : "bg-amber-900 text-amber-200"}`}>
                    {m.status === "done" ? "100%" : "Com aviso"}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {isFetchingData && (
        <div className="flex items-center gap-3 text-slate-300">
          <Spinner className="h-5 w-5" />
          <span>Buscando dados no Zoho e preparando gráficos...</span>
        </div>
      )}

      {!hasFetched && (
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle>Dados ainda não carregados</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            Escolha o período e clique em “Aplicar filtros” para buscar os indicadores.
          </CardContent>
        </Card>
      )}

      {hasFetched && resumoQuery.data && !isFetchingData && (
        <>
          <TooltipProvider delayDuration={100}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                <MetricCard
                  title="Comissão"
                  value={formatCurrency(resumoQuery.data.cards.comissao)}
                  hint={`Δ7d: ${formatPercent(deltas.comissao)}`}
                  tooltip="Soma da comissão total no período filtrado."
                  compact
                />
                <MetricCard
                  title="Líquido"
                  value={formatCurrency(resumoQuery.data.cards.liquido)}
                  hint={`Δ7d: ${formatPercent(deltas.liquido)}`}
                  tooltip="Soma do líquido liberado no período."
                  compact
                />
                <MetricCard
                  title="Comissão Média %"
                  value={formatPercent(resumoQuery.data.cards.takeRate)}
                  hint={`Limpa (sem pendências): ${formatPercent(resumoQuery.data.cards.takeRateLimpo ?? 0)}`}
                  tooltip="Percentual médio de comissão sobre o líquido."
                  compact
                />
                <MetricCard
                  title="Ticket Médio"
                  value={formatCurrency(resumoQuery.data.cards.ticketMedio)}
                  tooltip="Líquido médio por contrato."
                  compact
                />
                <MetricCard
                title="Contratos"
                value={resumoQuery.data.cards.contratos.toLocaleString("pt-BR")}
                tooltip="Quantidade de contratos no período."
                hint={`Sem comissão: ${resumoQuery.data.cards.contratosSemComissao ?? 0}`}
                compact
              />
                <MetricCard
                  title="% Comissão Calculada"
                  value={formatPercent(resumoQuery.data.cards.pctComissaoCalculada)}
                  tooltip="Percentual de contratos com comissão calculada via percentual (dado ausente no Zoho)."
                  compact
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <MetricCard
                  title="Meta Comissão"
                  tooltip="Meta de comissão para o mês (pode editar)."
                  value={
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={metaInput}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setMetaInput(e.target.value)}
                        className="bg-slate-900 border-slate-700 h-10 w-32"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const val = Number.parseFloat(metaInput);
                          if (Number.isNaN(val)) {
                            toast.error("Valor inválido");
                            return;
                          }
                          setMetaMutation.mutate({ mes: dateFrom.slice(0, 7), valor: val });
                        }}
                        disabled={setMetaMutation.isPending}
                      >
                        {setMetaMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  }
                />
                <MetricCard
                  title="Pace Comissão (R$/dia)"
                  value={formatCurrency(resumoQuery.data.cards.paceComissao ?? 0)}
                  tooltip="Comissão média por dia corrido no período."
                />
                <MetricCard
                  title="Necessário/dia p/ meta"
                  value={formatCurrency(resumoQuery.data.cards.necessarioPorDia ?? 0)}
                  badge={
                    (resumoQuery.data.cards.paceComissao ?? 0) >= (resumoQuery.data.cards.necessarioPorDia ?? 0)
                      ? "À frente"
                      : "Atrás"
                  }
                  tooltip="Quanto falta por dia para alcançar a meta de comissão."
                />
                <MetricCard
                  title="Dias (decorridos/total)"
                  value={`${resumoQuery.data.cards.diasDecorridos ?? 0}/${resumoQuery.data.cards.totalDias ?? 0}`}
                  tooltip="Dias corridos dentro do período selecionado."
                  compact
                />
              </div>
            </div>
          </TooltipProvider>

          <AlertsCard
            alerts={resumoQuery.data.alerts}
            filterState={filterState}
            onFilter={applyFilter}
            onRefresh={() => resumoQuery.refetch()}
          />

          <Separator className="bg-slate-800" />

          <HealthPipelineSection
            timeseriesData={timeseriesData}
            stageData={stageData}
            seriesVisibility={seriesVisibility}
            onLegendToggle={handleLegendToggle}
            necessarioPorDia={resumoQuery.data.cards.necessarioPorDia}
            onStageClick={handleStageClick}
            onClearFilters={clearFilters}
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
              rows={resumoQuery.data.byStage.map((b) => ({
                label: b.etapa,
                value: formatCurrency(b.comissao),
                extra: `${b.count} | ${formatPercent(b.takeRate)}`,
                active: filterState.etapaPipeline.includes(b.etapa),
                onClick: () =>
                  applyFilter({
                    etapaPipeline: filterState.etapaPipeline.includes(b.etapa)
                      ? filterState.etapaPipeline
                      : [b.etapa],
                  }),
              }))}
            />
            <ClickableList
              title="Por Vendedor"
              rows={sellersSorted.map((b) => ({
                label: b.vendedor,
                value: formatCurrency(b.comissao),
                extra: `${b.count} | ${formatPercent(b.takeRate)}`,
                active: filterState.vendedorNome.includes(b.vendedor),
                onClick: () =>
                  applyFilter({
                    vendedorNome: filterState.vendedorNome.includes(b.vendedor)
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

          <DrilldownTable
            rows={drilldownQuery.data?.data ?? []}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            flagFilters={flagFilters}
            toggleFlag={toggleFlag}
            flagCounts={flagCounts}
            page={page}
            onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
            onNextPage={() => setPage((p) => p + 1)}
            onExport={handleExport}
            takeRateBaseline={resumoQuery.data?.cards.takeRate}
            isEmpty={(drilldownQuery.data?.data?.length ?? 0) === 0}
            isExporting={exportQuery.isFetching}
          />
        </>
      )}
    </div>
  );
}
