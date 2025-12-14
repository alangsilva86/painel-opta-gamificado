import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ScatterChart,
  Scatter,
  Legend,
  ReferenceLine,
} from "recharts";

function startOfMonthISO(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function endOfMonthISO(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function formatCurrency(value?: number) {
  if (typeof value !== "number") return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

function formatPercent(value?: number) {
  if (typeof value !== "number") return "0%";
  return `${(value * 100).toFixed(1)}%`;
}

function formatRelativeTime(date?: string | Date | null) {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  return `${days}d atrás`;
}

export default function Gestao() {
  const now = useMemo(() => new Date(), []);
  const [dateFrom, setDateFrom] = useState(startOfMonthISO(now));
  const [dateTo, setDateTo] = useState(endOfMonthISO(now));
  const hasGestaoCookie =
    typeof document !== "undefined" ? document.cookie.includes("gestao_access=1") : false;
  const [authed, setAuthed] = useState(hasGestaoCookie);
  const [password, setPassword] = useState("");
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<"executivo" | "operacao">("executivo");
  const [filterState, setFilterState] = useState<{
    etapaPipeline: string[];
    vendedorNome: string[];
    produto: string[];
    tipoOperacao: string[];
  }>({
    etapaPipeline: [],
    vendedorNome: [],
    produto: [],
    tipoOperacao: [],
  });
  const [flagFilters, setFlagFilters] = useState({
    comissaoCalculada: false,
    liquidoFallback: false,
    inconsistenciaData: false,
  });
  const [sortBy, setSortBy] = useState<"data" | "comissao" | "liquido" | "takeRate">("data");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filters = useMemo(
    () => ({
      dateFrom,
      dateTo,
      ...filterState,
    }),
    [dateFrom, dateTo, filterState]
  );

  const resumoQuery = trpc.gestao.getResumo.useQuery(filters, {
    enabled: authed,
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
      sortBy,
      sortDir,
    },
    {
      enabled: authed,
      retry: false,
    }
  );

  const exportQuery = trpc.gestao.exportCSV.useQuery(filters, { enabled: false });
  const healthQuery = trpc.gestao.getHealth.useQuery({}, { enabled: authed });
  const setMetaMutation = trpc.gestao.setMetaComissao.useMutation({
    onSuccess: async () => {
      await resumoQuery.refetch();
      toast.success("Meta de comissão atualizada");
    },
    onError: () => toast.error("Falha ao atualizar meta"),
  });

  const authMutation = trpc.gestao.auth.useMutation({
    onSuccess: () => {
      setAuthed(true);
      resumoQuery.refetch();
      drilldownQuery.refetch();
      toast.success("Acesso liberado");
    },
    onError: () => toast.error("Senha inválida"),
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

  const currencyTick = (v: number) => formatCurrency(v);
  const percentTick = (v: number) => `${(v * 100).toFixed(0)}%`;
  const shortLabel = (label: string, max = 12) => (label.length > max ? `${label.slice(0, max)}…` : label);
  const formatDateTick = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const handleStageClick = (etapa: string) =>
    applyFilter({
      etapaPipeline: filterState.etapaPipeline.includes(etapa) ? filterState.etapaPipeline : [etapa],
    });
  const handleProductClick = (produto: string) =>
    applyFilter({
      produto: filterState.produto.includes(produto) ? filterState.produto : [produto],
    });
  const handleOperationClick = (tipoOperacao: string) =>
    applyFilter({
      tipoOperacao: filterState.tipoOperacao.includes(tipoOperacao)
        ? filterState.tipoOperacao
        : [tipoOperacao],
    });
  const handleSellerClick = (vendedor: string) =>
    applyFilter({
      vendedorNome: filterState.vendedorNome.includes(vendedor) ? filterState.vendedorNome : [vendedor],
    });

  const scatterTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return tooltipBox(p.produto, [
      { label: "Ticket", value: formatCurrency(p.ticket) },
      { label: "Comissão média", value: formatPercent(p.takeRate) },
    ]);
  };

  const handleSort = (col: typeof sortBy) => {
    setPage(1);
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const sortLabel = (col: typeof sortBy) => {
    if (sortBy !== col) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  };

  const renderEmptyChart = (message: string) => (
    <div className="flex h-full items-center justify-center text-sm text-slate-300">
      <div className="text-center space-y-1">
        <div>{message}</div>
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Limpar filtros
        </Button>
      </div>
    </div>
  );

  const tooltipBox = (title: string | undefined, rows: Array<{ label: string; value: string; emphasis?: boolean }>) => (
    <div className="rounded-xl border border-slate-700 bg-slate-800/95 px-3 py-2 text-xs text-white shadow-md space-y-1">
      {title && <div className="font-semibold">{title}</div>}
      {rows.map((r) => (
        <div key={r.label} className={r.emphasis ? "font-semibold" : ""}>
          {r.label}: {r.value}
        </div>
      ))}
    </div>
  );

  const [seriesVisibility, setSeriesVisibility] = useState<{ comissao: boolean; liquido: boolean }>({
    comissao: true,
    liquido: true,
  });

  const handleLegendToggle = (dataKey?: string) => {
    if (!dataKey) return;
    if (dataKey === "comissao" || dataKey === "liquido") {
      setSeriesVisibility((prev) => ({ ...prev, [dataKey]: !prev[dataKey as "comissao" | "liquido"] }));
    }
  };

  const dualLineTooltip = ({ label, payload }: any) => {
    if (!payload || payload.length === 0) return null;
    const date = label ? formatDateTick(label) : "";
    const item = payload[0]?.payload;
    return tooltipBox(date, [
      ...(seriesVisibility.comissao
        ? [{ label: "Comissão", value: formatCurrency(item?.comissao ?? 0), emphasis: true }]
        : []),
      ...(seriesVisibility.liquido
        ? [{ label: "Líquido", value: formatCurrency(item?.liquido ?? 0) }]
        : []),
    ]);
  };

  const dualBarTooltip = ({ label, payload }: any) => {
    if (!payload || payload.length === 0) return null;
    const item = payload[0]?.payload;
    const takeRateVal = item?.liquido > 0 ? item.comissao / item.liquido : 0;
    return tooltipBox(label, [
      ...(seriesVisibility.comissao
        ? [{ label: "Comissão", value: formatCurrency(item?.comissao ?? 0), emphasis: true }]
        : []),
      ...(seriesVisibility.liquido
        ? [{ label: "Líquido", value: formatCurrency(item?.liquido ?? 0) }]
        : []),
      ...(item?.count !== undefined ? [{ label: "Contratos", value: String(item.count) }] : []),
      { label: "Comissão média", value: formatPercent(takeRateVal) },
    ]);
  };

  const [metaInput, setMetaInput] = useState("");

  useEffect(() => {
    if (resumoQuery.data?.cards.metaComissao !== undefined) {
      setMetaInput(resumoQuery.data.cards.metaComissao.toString());
    }
  }, [resumoQuery.data?.cards.metaComissao]);

  const handleExport = async () => {
    const res = await exportQuery.refetch();
    if (!res.data?.csv) return;
    const blob = new Blob([res.data.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gestao_${dateFrom}_a_${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = resumoQuery.isLoading || drilldownQuery.isLoading;
  const applyFilter = (partial: Partial<typeof filterState>) => {
    setPage(1);
    setFilterState((prev) => ({ ...prev, ...partial }));
  };
  const clearFilters = () =>
    setFilterState({
      etapaPipeline: [],
      vendedorNome: [],
      produto: [],
      tipoOperacao: [],
    });

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
              onChange={(e) => setPassword(e.target.value)}
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

  const renderSectionHeader = (title: string, description?: string, extra?: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-lg font-semibold text-slate-100">{title}</div>
        {description && <div className="text-xs text-slate-400">{description}</div>}
      </div>
      {extra}
    </div>
  );

  const severityColors = {
    info: "border-blue-700 bg-blue-950 text-blue-100",
    warning: "border-amber-700 bg-amber-950 text-amber-100",
    critical: "border-red-700 bg-red-950 text-red-100",
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white px-4 py-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestão</h1>
          <p className="text-sm text-slate-300">KPIs e drilldown com base nos dados normalizados.</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span>Modo:</span>
            <div className="flex gap-2">
              <Button
                variant={mode === "executivo" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setMode("executivo")}
              >
                Executivo
              </Button>
              <Button
                variant={mode === "operacao" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setMode("operacao")}
              >
                Operação
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Data início</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-slate-950 border-slate-800"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Data fim</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-slate-950 border-slate-800"
            />
          </div>
          <Button onClick={() => { resumoQuery.refetch(); drilldownQuery.refetch(); }}>Aplicar filtros</Button>
          <Button variant="outline" onClick={handleExport} disabled={exportQuery.isFetching}>
            {exportQuery.isFetching ? "Exportando..." : "Exportar CSV"}
          </Button>
          <Button variant="ghost" onClick={clearFilters} className="text-slate-300">
            Limpar filtros
          </Button>
        </div>
      </div>

      {Object.values(filterState).some((arr) => arr.length > 0) && (
        <div className="flex flex-wrap gap-2 text-sm text-slate-200">
          {filterState.etapaPipeline.map((v) => (
            <Badge
              key={`etapa-${v}`}
              variant="outline"
              className="border-slate-700 cursor-pointer"
              onClick={() =>
                applyFilter({ etapaPipeline: filterState.etapaPipeline.filter((i) => i !== v) })
              }
            >
              Etapa: {v} ✕
            </Badge>
          ))}
          {filterState.vendedorNome.map((v) => (
            <Badge
              key={`vendedor-${v}`}
              variant="outline"
              className="border-slate-700 cursor-pointer"
              onClick={() =>
                applyFilter({ vendedorNome: filterState.vendedorNome.filter((i) => i !== v) })
              }
            >
              Vendedor: {v} ✕
            </Badge>
          ))}
          {filterState.produto.map((v) => (
            <Badge
              key={`produto-${v}`}
              variant="outline"
              className="border-slate-700 cursor-pointer"
              onClick={() =>
                applyFilter({ produto: filterState.produto.filter((i) => i !== v) })
              }
            >
              Produto: {v} ✕
            </Badge>
          ))}
          {filterState.tipoOperacao.map((v) => (
            <Badge
              key={`tipo-${v}`}
              variant="outline"
              className="border-slate-700 cursor-pointer"
              onClick={() =>
                applyFilter({ tipoOperacao: filterState.tipoOperacao.filter((i) => i !== v) })
              }
            >
              Tipo: {v} ✕
            </Badge>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-3 text-slate-300">
          <Spinner className="h-5 w-5" />
          <span>Carregando dados...</span>
        </div>
      )}

      {resumoQuery.data && (
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
                        onChange={(e) => setMetaInput(e.target.value)}
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

          {resumoQuery.data.alerts && resumoQuery.data.alerts.length > 0 ? (
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle>Alertas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {resumoQuery.data.alerts.map((alert) => {
                  const color =
                    alert.severity === "critical"
                      ? severityColors.critical
                      : alert.severity === "warning"
                        ? severityColors.warning
                        : severityColors.info;
                  return (
                    <div
                      key={alert.title}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 ${color}`}
                    >
                      <div>
                        <div className="text-sm font-semibold flex items-center gap-2">
                          {alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️"}
                          {alert.title}
                        </div>
                        <div className="text-xs opacity-80">{alert.detail}</div>
                        {alert.generatedAt && (
                          <div className="text-[11px] opacity-70">Disparou {formatRelativeTime(alert.generatedAt)}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {alert.filters && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              applyFilter({
                                etapaPipeline: alert.filters?.etapaPipeline ?? filterState.etapaPipeline,
                                vendedorNome: alert.filters?.vendedorNome ?? filterState.vendedorNome,
                                produto: alert.filters?.produto ?? filterState.produto,
                              });
                            }}
                          >
                            Filtrar
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => resumoQuery.refetch()}>
                          Limpar alerta
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle>Alertas</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300">Tudo estável. Revise mix e pipeline para oportunidades.</CardContent>
            </Card>
          )}

          <Separator className="bg-slate-800" />

          {/* Qualidade do dado */}
          {mode === "operacao" && (
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle>Qualidade do Dado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <MetricCard
                    title="% Comissão Calculada"
                    value={formatPercent(healthQuery.data?.pctComissaoCalculada ?? 0)}
                  />
                  <MetricCard
                    title="% Líquido Fallback"
                    value={formatPercent(healthQuery.data?.pctLiquidoFallback ?? 0)}
                  />
                  <MetricCard
                    title="% Inconsistência Data"
                    value={formatPercent(healthQuery.data?.pctInconsistenciaData ?? 0)}
                  />
                  <MetricCard
                    title="Registros (recorte)"
                    value={(healthQuery.data?.totalRegistros ?? 0).toLocaleString("pt-BR")}
                  />
                  <MetricCard
                    title="Último sync"
                    value={formatRelativeTime(healthQuery.data?.lastSyncAt ?? null)}
                    hint="Acima de 60min: investigar cron"
                  />
                </div>
                {healthQuery.data?.logs && healthQuery.data.logs.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400">Últimos syncs</div>
                    {healthQuery.data.logs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200"
                      >
                        <div className="flex flex-wrap gap-2">
                          <span className="font-semibold">{log.rangeInicio} → {log.rangeFim}</span>
                          <span>fetched {log.fetched}</span>
                          <span>upserted {log.upserted}</span>
                          <span>unchanged {log.unchanged}</span>
                          <span>skipped {log.skipped}</span>
                          <span>duration {log.durationMs}ms</span>
                        </div>
                        {log.warnings && <div className="text-slate-400 mt-1">Warn: {log.warnings}</div>}
                        <div className="mt-1 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setFlagFilters((prev) => ({ ...prev, comissaoCalculada: true }))
                            }
                          >
                            Ver calc%
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setFlagFilters((prev) => ({ ...prev, liquidoFallback: true }))
                            }
                          >
                            Ver fallback
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setFlagFilters((prev) => ({ ...prev, inconsistenciaData: true }))
                            }
                          >
                            Ver data*
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Saúde e Pace */}
          {mode === "operacao" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="bg-slate-950 border-slate-800">
                <CardHeader>
                  <CardTitle>Série temporal (Comissão x Líquido)</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={resumoQuery.data.timeseries}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#1f2937" />
                      <XAxis dataKey="date" stroke="#9ca3af" tickFormatter={formatDateTick} />
                      <YAxis stroke="#9ca3af" tickFormatter={currencyTick} />
                      <Tooltip content={dualLineTooltip} />
                      <Legend onClick={(o) => handleLegendToggle((o as any).dataKey)} />
                      <Line
                        type="monotone"
                        dataKey="comissao"
                        name="Comissão"
                        stroke="#22c55e"
                        dot={false}
                        strokeWidth={2}
                        hide={!seriesVisibility.comissao}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="liquido"
                        name="Líquido"
                        stroke="#3b82f6"
                        dot={false}
                        strokeWidth={2}
                        hide={!seriesVisibility.liquido}
                        activeDot={{ r: 4 }}
                      />
                    {resumoQuery.data.cards.necessarioPorDia ? (
                      <ReferenceLine
                        y={resumoQuery.data.cards.necessarioPorDia}
                        stroke="#f97316"
                        strokeDasharray="4 4"
                        label={{ value: "Necessário/dia", position: "left", fill: "#f97316", fontSize: 12 }}
                      />
                    ) : null}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
              </Card>

              <Card className="bg-slate-950 border-slate-800">
                <CardHeader>
                  <CardTitle>Pipeline por Etapa</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    {resumoQuery.data.byStage.length === 0
                      ? renderEmptyChart("Sem dados de pipeline para este recorte.")
                      : (
                        <BarChart data={resumoQuery.data.byStage}>
                          <CartesianGrid strokeDasharray="2 4" stroke="#1f2937" />
                          <XAxis dataKey="etapa" stroke="#9ca3af" tickFormatter={(v) => shortLabel(v, 14)} />
                          <YAxis stroke="#9ca3af" tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip content={dualBarTooltip} />
                    <Legend
                      onClick={(o) => handleLegendToggle((o as any).dataKey)}
                      formatter={(value) => (
                        <span className="text-slate-200 text-xs">
                          {value} · clique para esconder/mostrar
                        </span>
                      )}
                    />
                          <Bar
                            dataKey="comissao"
                            name="Comissão"
                            fill="#22c55e"
                            cursor="pointer"
                            hide={!seriesVisibility.comissao}
                            onClick={(data) => handleStageClick((data as any).etapa)}
                          />
                          <Bar
                            dataKey="liquido"
                            name="Líquido"
                            fill="#3b82f6"
                            cursor="pointer"
                            hide={!seriesVisibility.liquido}
                            onClick={(data) => handleStageClick((data as any).etapa)}
                          />
                        </BarChart>
                      )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Alavancas */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle>Pareto Vendedores (Comissão)</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={resumoQuery.data.bySeller
                      .slice()
                      .sort((a, b) => b.comissao - a.comissao)
                      .map((item, idx, arr) => {
                        const total = arr.reduce((acc, it) => acc + it.comissao, 0);
                        const cum = arr.slice(0, idx + 1).reduce((acc, it) => acc + it.comissao, 0);
                        return { ...item, cumulativo: total > 0 ? (cum / total) * 100 : 0 };
                      })}
                  >
                    <CartesianGrid strokeDasharray="2 4" stroke="#1f2937" />
                    <XAxis dataKey="vendedor" stroke="#9ca3af" tickFormatter={(v) => shortLabel(v, 12)} />
                    <YAxis yAxisId="left" stroke="#9ca3af" tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" tickFormatter={(v) => `${v.toFixed(0)}%`} />
                    <Tooltip
                      content={({ payload }) => {
                        if (!payload || payload.length === 0) return null;
                        const item = payload[0]?.payload;
                        return tooltipBox(item?.vendedor, [
                          { label: "Comissão", value: formatCurrency(item?.comissao ?? 0), emphasis: true },
                          { label: "Take rate", value: formatPercent(item?.takeRate ?? 0) },
                          { label: "Cumulativo", value: `${(item?.cumulativo ?? 0).toFixed(1)}%` },
                        ]);
                      }}
                    />
                    <Legend
                      onClick={(o) => handleLegendToggle((o as any).dataKey)}
                      formatter={(value) => (
                        <span className="text-slate-200 text-xs">
                          {value} · clique para esconder/mostrar
                        </span>
                      )}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="comissao"
                      name="Comissão"
                      fill="#22c55e"
                      onClick={(data) => handleSellerClick((data as any).vendedor)}
                      cursor="pointer"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cumulativo"
                      name="Cumulativo %"
                      stroke="#f97316"
                      dot={false}
                      strokeWidth={2}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle>Scatter: Comissão Média x Ticket (Produto)</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis
                      type="number"
                      dataKey="ticket"
                      name="Ticket"
                      stroke="#9ca3af"
                      tickFormatter={(v) => formatCurrency(v)}
                    />
                    <YAxis
                      type="number"
                      dataKey="takeRate"
                      name="Comissão média"
                      stroke="#9ca3af"
                      tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
                      domain={[0, (dataMax: number) => (dataMax ? dataMax * 1.1 : 0.05)]}
                    />
                    <Tooltip content={scatterTooltip} />
                    <Scatter
                      data={resumoQuery.data.byProduct.map((p) => ({
                        produto: p.produto,
                        ticket: p.count > 0 ? p.liquido / p.count : 0,
                        takeRate: p.takeRate,
                        liquido: p.liquido,
                        fill: filterState.produto.includes(p.produto) ? "#22c55e" : "#8b5cf6",
                      }))}
                      name="Produto"
                      onClick={(data) => handleProductClick((data as any).produto)}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
              <Card className="bg-slate-950 border-slate-800">
                <CardHeader>
                  <CardTitle>Mix por Produto</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                  {resumoQuery.data.byProduct.length === 0
                    ? renderEmptyChart("Sem dados de produto para este recorte.")
                    : (
                      <BarChart data={resumoQuery.data.byProduct}>
                        <CartesianGrid strokeDasharray="2 4" stroke="#1f2937" />
                        <XAxis dataKey="produto" stroke="#9ca3af" tickFormatter={(v) => shortLabel(v, 14)} />
                        <YAxis stroke="#9ca3af" tickFormatter={(v) => formatCurrency(v)} />
                        <Tooltip
                          formatter={(val: any, name: string, props: any) => {
                            const item = props?.payload;
                            const pct = item?.liquido > 0 ? item.comissao / item.liquido : 0;
                            return [
                              formatCurrency(Number(val)),
                              name === "Comissão"
                                ? `Comissão (${item.count} contratos, take rate ${formatPercent(pct)})`
                                : "Líquido",
                            ];
                          }}
                        />
                        <Legend
                          onClick={(o) => handleLegendToggle((o as any).dataKey)}
                          formatter={(value) => (
                            <span className="text-slate-200 text-xs">
                              {value} · clique para esconder/mostrar
                            </span>
                          )}
                        />
                        <Bar
                          dataKey="comissao"
                          name="Comissão"
                          fill="#22c55e"
                          cursor="pointer"
                          hide={!seriesVisibility.comissao}
                          onClick={(data) => handleProductClick((data as any).produto)}
                        />
                        <Bar
                          dataKey="liquido"
                          name="Líquido"
                          fill="#3b82f6"
                          cursor="pointer"
                          hide={!seriesVisibility.liquido}
                          onClick={(data) => handleProductClick((data as any).produto)}
                        />
                      </BarChart>
                    )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                  <CardTitle>Mix por Tipo de Operação</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                  {resumoQuery.data.byOperationType.length === 0
                    ? renderEmptyChart("Sem dados de tipo de operação para este recorte.")
                    : (
                      <BarChart data={resumoQuery.data.byOperationType}>
                        <CartesianGrid strokeDasharray="2 4" stroke="#1f2937" />
                        <XAxis dataKey="tipoOperacao" stroke="#9ca3af" tickFormatter={(v) => shortLabel(v, 16)} />
                        <YAxis stroke="#9ca3af" tickFormatter={(v) => formatCurrency(v)} />
                        <Tooltip
                          formatter={(val: any, name: string, props: any) => {
                            const item = props?.payload;
                            const pct = item?.liquido > 0 ? item.comissao / item.liquido : 0;
                            return [
                              formatCurrency(Number(val)),
                              name === "Comissão"
                                ? `Comissão (${item.count} contratos, take rate ${formatPercent(pct)})`
                                : "Líquido",
                            ];
                          }}
                        />
                        <Legend onClick={(o) => handleLegendToggle((o as any).dataKey)} />
                        <Bar
                          dataKey="comissao"
                          name="Comissão"
                          fill="#22c55e"
                          cursor="pointer"
                          hide={!seriesVisibility.comissao}
                          onClick={(data) => handleOperationClick((data as any).tipoOperacao)}
                        />
                        <Bar
                          dataKey="liquido"
                          name="Líquido"
                          fill="#3b82f6"
                          cursor="pointer"
                          hide={!seriesVisibility.liquido}
                          onClick={(data) => handleOperationClick((data as any).tipoOperacao)}
                        />
                      </BarChart>
                    )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

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
              rows={resumoQuery.data.bySeller.map((b) => ({
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
            <ClickableList
              title="Por Produto"
              rows={resumoQuery.data.byProduct.map((b) => ({
                label: b.produto,
                value: formatCurrency(b.comissao),
                extra: `${b.count} | ${formatPercent(b.takeRate)}`,
                active: filterState.produto.includes(b.produto),
                onClick: () =>
                  applyFilter({
                    produto: filterState.produto.includes(b.produto)
                      ? filterState.produto
                      : [b.produto],
                  }),
              }))}
            />
          </div>

          {mode === "operacao" && (
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <CardTitle>Drilldown</CardTitle>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                    <Badge
                      variant={flagFilters.comissaoCalculada ? "secondary" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        setFlagFilters((p) => ({ ...p, comissaoCalculada: !p.comissaoCalculada }))
                      }
                    >
                      Comissão calculada ({flagCounts.calc})
                    </Badge>
                    <Badge
                      variant={flagFilters.liquidoFallback ? "secondary" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        setFlagFilters((p) => ({ ...p, liquidoFallback: !p.liquidoFallback }))
                      }
                    >
                      Líquido fallback ({flagCounts.liq})
                    </Badge>
                    <Badge
                      variant={flagFilters.inconsistenciaData ? "secondary" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        setFlagFilters((p) => ({ ...p, inconsistenciaData: !p.inconsistenciaData }))
                      }
                    >
                      Inconsistência de data ({flagCounts.dataInc})
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="overflow-y-auto max-h-[480px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-950 z-10">
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort("data")}>
                          Data {sortLabel("data")}
                        </TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Etapa</TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort("liquido")}>
                          Líquido {sortLabel("liquido")}
                        </TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort("comissao")}>
                          Comissão {sortLabel("comissao")}
                        </TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort("takeRate")}>
                          Take Rate {sortLabel("takeRate")}
                        </TableHead>
                        <TableHead>Flags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drilldownQuery.data?.data.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-slate-300">
                            Sem dados neste período. Ajuste as datas ou filtros.
                          </TableCell>
                        </TableRow>
                      )}
                      {drilldownQuery.data?.data.map((row, idx) => (
                        <TableRow key={row.idContrato} className={idx % 2 === 0 ? "bg-[#0f172a]" : "bg-[#111827]"}>
                          <TableCell className="font-mono text-xs">{row.numeroContrato || row.idContrato}</TableCell>
                          <TableCell>{row.dataPagamento ? new Date(row.dataPagamento).toLocaleDateString("pt-BR") : "-"}</TableCell>
                          <TableCell>{row.vendedorNome}</TableCell>
                          <TableCell>{row.produto}</TableCell>
                          <TableCell>{row.etapaPipeline}</TableCell>
                          <TableCell>{formatCurrency(row.liquido)}</TableCell>
                          <TableCell>{formatCurrency(row.comissaoTotal)}</TableCell>
                          <TableCell className="flex items-center gap-1">
                            <span>{formatPercent(row.takeRate)}</span>
                            {resumoQuery.data && (
                              <span className="text-[11px] text-slate-400">
                                {row.takeRate >= resumoQuery.data.cards.takeRate ? "↑" : "↓"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400 space-x-1">
                            {row.flags.inconsistenciaDataPagamento && <span>data*</span>}
                            {row.flags.liquidoFallback && <span>liq_fallback</span>}
                            {row.flags.comissaoCalculada && <span>calc%</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    Página anterior
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
                    Próxima página
                  </Button>
                  <Button size="sm" onClick={handleExport} disabled={exportQuery.isFetching}>
                    Exportar recorte
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint,
  badge,
  compact = false,
  tooltip,
}: {
  title: string;
  value: string | React.ReactNode;
  hint?: string;
  badge?: string;
  compact?: boolean;
  tooltip?: string;
}) {
  const content = (
    <Card className="bg-slate-950 border-slate-800 h-full">
      <CardHeader className={compact ? "pb-1" : "pb-2"}>
        <CardTitle className="text-sm font-semibold text-slate-300">{title}</CardTitle>
      </CardHeader>
      <CardContent className={`${compact ? "text-lg" : "text-xl"} font-semibold flex items-center gap-2`}>
        {value}
        {badge && (
          <span
            className={`text-xs px-2 py-1 rounded ${
              badge.includes("À frente") ? "bg-emerald-900 text-emerald-200" : "bg-amber-900 text-amber-200"
            }`}
          >
            {badge}
          </span>
        )}
      </CardContent>
      {hint && <div className="px-4 pb-3 text-xs text-slate-400">{hint}</div>}
    </Card>
  );

  if (!tooltip) return content;

  return (
    <UiTooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent className="text-xs max-w-xs">{tooltip}</TooltipContent>
    </UiTooltip>
  );
}

function ClickableList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string; extra?: string; onClick?: () => void; active?: boolean }>;
}) {
  return (
    <Card className="bg-slate-950 border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-400">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer ${
              row.active ? "border-emerald-500 bg-emerald-900/20" : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
            onClick={row.onClick}
          >
            <div>
              <div className="text-sm font-medium">{row.label}</div>
              {row.extra && <div className="text-xs text-slate-400">{row.extra}</div>}
            </div>
            <div className="text-sm font-semibold">{row.value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
