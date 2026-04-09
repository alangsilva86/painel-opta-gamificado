import {
  useDeferredValue,
  useEffect,
  useState,
  startTransition,
  type ChangeEvent,
} from "react";
import { skipToken } from "@tanstack/react-query";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { AnimatedProgressBar } from "@/components/AnimatedProgressBar";
import DashboardLayout from "@/components/DashboardLayout";
import { KpiCard } from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatPercent } from "@/features/gestao/utils";
import type {
  DrilldownFinanceiroResponse,
  FinanceiroSyncStatus,
  ResumoFinanceiro,
  SerieHistoricaItem,
} from "@/features/financeiro/types";
import {
  Landmark,
  PiggyBank,
  PercentIcon,
  Scale,
  TrendingDown,
  TrendingUp,
  X,
  FileStack,
} from "lucide-react";

const chartConfig = {
  competencia: {
    label: "Comissão Opta",
    color: "var(--chart-1)",
  },
  receitas: {
    label: "Receita Caixa",
    color: "var(--chart-2)",
  },
  despesas: {
    label: "Despesas Caixa",
    color: "var(--chart-4)",
  },
  resultado: {
    label: "Resultado Líquido",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const PAGE_SIZE = 12;

function hasGestaoAccessCookie() {
  return (
    typeof document !== "undefined" &&
    document.cookie.split(";").some(part => part.trim() === "gestao_access=1")
  );
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthDateRange(mes: string) {
  const [year, month] = mes.split("-").map(Number);
  const start = `${mes}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  return {
    inicio: start,
    fim: `${mes}-${String(lastDay).padStart(2, "0")}`,
  };
}

function formatMonthLabel(mes: string) {
  return new Date(`${mes}-01T00:00:00Z`).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function getDelta(current: number, previous?: number | null) {
  if (previous === null || previous === undefined || previous === 0) {
    return null;
  }

  return (current - previous) / Math.abs(previous);
}

function formatDelta(delta: number | null, previousLabel: string) {
  if (delta === null) {
    return `Sem base em ${previousLabel}`;
  }

  const direction = delta >= 0 ? "↑" : "↓";
  return `${direction} ${formatPercent(Math.abs(delta))} vs ${previousLabel}`;
}

function getTypeLabel(tipo: string) {
  const labels: Record<string, string> = {
    revenue: "Receitas",
    fixed_expense: "Despesas fixas",
    variable_expense: "Despesas variáveis",
    payroll: "Folha",
    tax: "Impostos",
    transfer: "Transferências",
  };

  return labels[tipo] ?? tipo;
}

function buildDreGroups(summary?: ResumoFinanceiro) {
  const grouped = new Map<string, Array<{ categoria: string; valor: number }>>();

  summary?.caixa.porCategoria.forEach(item => {
    const current = grouped.get(item.tipo) ?? [];
    current.push({ categoria: item.categoria, valor: item.valor });
    grouped.set(item.tipo, current);
  });

  return grouped;
}

function MetricDelta({
  delta,
  previousLabel,
}: {
  delta: number | null;
  previousLabel: string;
}) {
  const isPositive = (delta ?? 0) >= 0;

  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        delta === null
          ? "bg-muted text-muted-foreground"
          : isPositive
            ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25"
            : "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/25"
      }`}
    >
      {formatDelta(delta, previousLabel)}
    </div>
  );
}

function FinanceiroContent() {
  const [mes, setMes] = useState(() => getCurrentMonthKey());
  const [tipo, setTipo] = useState<"revenue" | "expense" | "all">("all");
  const [categoria, setCategoria] = useState("");
  const [conta, setConta] = useState("");
  const [page, setPage] = useState(1);
  const [jobId, setJobId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(() => hasGestaoAccessCookie());

  const deferredTipo = useDeferredValue(tipo);
  const deferredCategoria = useDeferredValue(categoria);
  const deferredConta = useDeferredValue(conta);
  const drilldownInput = authed
    ? {
        mes,
        tipo: deferredTipo,
        page,
        pageSize: PAGE_SIZE,
        ...(deferredCategoria ? { categoria: deferredCategoria } : {}),
        ...(deferredConta ? { conta: deferredConta } : {}),
      }
    : skipToken;

  const resumoQuery = trpc.financeiro.getResumoFinanceiro.useQuery(
    { mes },
    {
      enabled: authed,
      retry: false,
    }
  );

  const serieQuery = trpc.financeiro.getSerieHistorica.useQuery(
    { meses: 6, mesReferencia: mes },
    {
      enabled: authed,
      retry: false,
    }
  );

  const drilldownQuery = trpc.financeiro.getDrilldownTransacoes.useQuery(
    drilldownInput,
    {
      retry: false,
    }
  );

  const syncMutation = trpc.financeiro.syncRange.useMutation({
    onSuccess: data => {
      setJobId(data.jobId);
      toast.success("Sincronização do Procfy iniciada.");
    },
    onError: error => {
      toast.error(error.message || "Falha ao sincronizar Procfy.");
    },
  });

  const authMutation = trpc.gestao.auth.useMutation({
    onSuccess: () => {
      setAuthed(true);
      setPassword("");
      toast.success("Acesso financeiro liberado.");
    },
    onError: error => {
      toast.error(error.message || "Senha inválida.");
    },
  });

  const syncStatusQuery = trpc.financeiro.getSyncStatus.useQuery(
    jobId ? { jobId } : skipToken,
    {
      refetchInterval: query => {
        const status = query.state.data?.status;
        return status === "done" ? false : 1500;
      },
    }
  );

  useEffect(() => {
    const status = syncStatusQuery.data as FinanceiroSyncStatus | undefined;
    if (!status || status.status !== "done") return;

    setJobId(null);
    const hasErrors = status.perMonth.some(item => item.status === "error");
    if (hasErrors) {
      toast.error("Sincronização concluída com falhas parciais.");
    } else {
      toast.success("Base financeira atualizada.");
    }

    void Promise.all([
      resumoQuery.refetch(),
      serieQuery.refetch(),
      drilldownQuery.refetch(),
    ]);
  }, [drilldownQuery, resumoQuery, serieQuery, syncStatusQuery.data]);

  useEffect(() => {
    const unauthorized =
      resumoQuery.error?.data?.code === "UNAUTHORIZED" ||
      serieQuery.error?.data?.code === "UNAUTHORIZED" ||
      drilldownQuery.error?.data?.code === "UNAUTHORIZED";

    if (unauthorized) {
      setAuthed(false);
    }
  }, [drilldownQuery.error, resumoQuery.error, serieQuery.error]);

  if (!authed) {
    return (
      <div className="page-shell">
        <div className="page-content flex min-h-[50vh] items-center justify-center px-4">
          <Card className="panel-card-strong w-full max-w-md">
            <CardHeader>
              <CardTitle>Acesso Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Insira a senha de gestão para acessar a visão de caixa.
              </p>
              <Input
                type="password"
                value={password}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setPassword(event.target.value)
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
                <p className="text-sm text-rose-300">
                  Erro: {authMutation.error.message}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const resumo = resumoQuery.data as ResumoFinanceiro | undefined;
  const serie = (serieQuery.data as SerieHistoricaItem[] | undefined) ?? [];
  const drilldown =
    (drilldownQuery.data as DrilldownFinanceiroResponse | undefined) ?? null;
  const syncStatus = syncStatusQuery.data as FinanceiroSyncStatus | undefined;
  const previousSerie = serie.length > 1 ? serie[serie.length - 2] : null;
  const previousLabel = previousSerie
    ? formatMonthLabel(previousSerie.mes)
    : "mês anterior";
  const chartData = serie.map(item => ({
    mes: item.mes,
    label: formatMonthLabel(item.mes),
    competencia: item.competencia / 100,
    receitas: item.receitas / 100,
    despesas: item.despesas / 100,
    resultado: item.resultado / 100,
  }));
  const dreGroups = buildDreGroups(resumo);
  const categoryOptions = Array.from(
    new Set((resumo?.caixa.porCategoria ?? []).map(item => item.categoria))
  ).sort((a, b) => a.localeCompare(b));
  const accountOptions = Array.from(
    new Set((resumo?.caixa.saldosContas ?? []).map(item => item.conta))
  ).sort((a, b) => a.localeCompare(b));
  const isInitialLoading =
    resumoQuery.isLoading || serieQuery.isLoading || drilldownQuery.isLoading;
  const isSyncing = syncMutation.isPending || Boolean(jobId);
  const errorMessage =
    resumoQuery.error?.message ||
    serieQuery.error?.message ||
    drilldownQuery.error?.message ||
    null;

  const handleMonthChange = (nextMes: string) => {
    startTransition(() => {
      setMes(nextMes);
      setTipo("all");
      setCategoria("");
      setConta("");
      setPage(1);
    });
  };

  const handleSync = async () => {
    const range = buildMonthDateRange(mes);
    await syncMutation.mutateAsync(range);
  };

  return (
    <div className="page-shell">
      <div className="page-content page-stack px-4">
        <section className="page-section">
          <div className="page-section-header">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Financeiro
              </h1>
              <p className="page-section-copy">
                Visão mensal de competência vs caixa, com DRE simplificado,
                saldos bancários e trilha transacional do Procfy.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="month"
                value={mes}
                onChange={event => handleMonthChange(event.target.value)}
                className="w-[11rem] rounded-xl border-border/70 bg-background/80"
              />
              <Button
                variant="outline"
                onClick={() => {
                  void handleSync();
                }}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Sincronizando...
                  </>
                ) : (
                  "Sincronizar Procfy"
                )}
              </Button>
            </div>
          </div>

          {syncStatus?.perMonth && syncStatus.perMonth.length > 0 && (
            <Card className="panel-card">
              <CardContent className="flex flex-wrap items-center gap-2 py-3 text-sm">
                {syncStatus.perMonth.map(item => (
                  <Badge
                    key={`${item.inicio}-${item.fim}`}
                    variant="outline"
                    className={
                      item.status === "done"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    }
                  >
                    {item.inicio} → {item.fim} · {item.status === "done" ? "OK" : "Falha"}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {isInitialLoading && (
            <Card className="panel-card">
              <CardContent className="flex items-center gap-3 py-5 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4 text-primary" />
                Carregando visão financeira...
              </CardContent>
            </Card>
          )}

          {errorMessage && (
            <Card className="panel-card border-rose-500/25">
              <CardContent className="py-5 text-sm text-rose-200">
                {errorMessage || "Falha ao carregar Financeiro."}
              </CardContent>
            </Card>
          )}

          {resumo && !isInitialLoading && !errorMessage && (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
                <KpiCard
                  title="Comissão Opta"
                  value={formatCurrency(resumo.competencia.comissaoOpta)}
                  subtitle={`Competência Zoho · Taxa ${resumo.competencia.receitaBruta > 0 ? formatPercent(resumo.competencia.comissaoOpta / resumo.competencia.receitaBruta) : "—"}`}
                  icon={Scale}
                  motionDelay={0}
                >
                  <MetricDelta
                    delta={getDelta(
                      resumo.competencia.comissaoOpta,
                      previousSerie ? previousSerie.competencia / 100 : null
                    )}
                    previousLabel={previousLabel}
                  />
                </KpiCard>

                <KpiCard
                  title="Receita Caixa"
                  value={formatCurrency(resumo.caixa.totalReceitas)}
                  subtitle="Receitas pagas no Procfy"
                  icon={TrendingUp}
                  motionDelay={0.05}
                >
                  <MetricDelta
                    delta={getDelta(
                      resumo.caixa.totalReceitas,
                      previousSerie ? previousSerie.receitas / 100 : null
                    )}
                    previousLabel={previousLabel}
                  />
                </KpiCard>

                <KpiCard
                  title="Despesas Caixa"
                  value={formatCurrency(resumo.caixa.totalDespesas)}
                  subtitle="Despesas fixas e variáveis"
                  icon={TrendingDown}
                  motionDelay={0.1}
                >
                  <MetricDelta
                    delta={getDelta(
                      resumo.caixa.totalDespesas,
                      previousSerie ? previousSerie.despesas / 100 : null
                    )}
                    previousLabel={previousLabel}
                  />
                </KpiCard>

                <KpiCard
                  title="Resultado Líquido"
                  value={formatCurrency(resumo.caixa.resultadoLiquido)}
                  subtitle="Receitas menos despesas, folha e impostos"
                  icon={PiggyBank}
                  motionDelay={0.15}
                  valueClassName={
                    resumo.caixa.resultadoLiquido < 0
                      ? "text-rose-300"
                      : resumo.caixa.resultadoLiquido > 0
                        ? "text-emerald-300"
                        : undefined
                  }
                >
                  <MetricDelta
                    delta={getDelta(
                      resumo.caixa.resultadoLiquido,
                      previousSerie ? previousSerie.resultado / 100 : null
                    )}
                    previousLabel={previousLabel}
                  />
                </KpiCard>

                <KpiCard
                  title="Gap Competência/Caixa"
                  value={formatCurrency(resumo.comparativo.gap)}
                  subtitle={formatPercent(resumo.comparativo.comissaoVsReceitaCaixa)}
                  icon={Landmark}
                  motionDelay={0.2}
                >
                  <MetricDelta
                    delta={getDelta(
                      resumo.comparativo.gap,
                      previousSerie
                        ? (previousSerie.receitas - previousSerie.competencia) / 100
                        : null
                    )}
                    previousLabel={previousLabel}
                  />
                </KpiCard>

                <KpiCard
                  title="Margem Operacional"
                  value={
                    resumo.caixa.totalReceitas > 0
                      ? formatPercent(resumo.caixa.resultadoLiquido / resumo.caixa.totalReceitas)
                      : "—"
                  }
                  subtitle="Resultado / Receita Caixa"
                  icon={PercentIcon}
                  motionDelay={0.25}
                  valueClassName={
                    resumo.caixa.resultadoLiquido < 0
                      ? "text-rose-300"
                      : resumo.caixa.resultadoLiquido > 0
                        ? "text-emerald-300"
                        : undefined
                  }
                />

                <KpiCard
                  title="Contratos no Mês"
                  value={resumo.competencia.quantidadeContratos}
                  subtitle="Competência Zoho"
                  icon={FileStack}
                  motionDelay={0.3}
                />
              </div>

              <Separator className="bg-border/70" />

              <div className="grid gap-4 xl:grid-cols-[1.6fr,0.9fr]">
                <Card className="panel-card-strong">
                  <CardHeader>
                    <CardTitle>Competência x Caixa</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[360px]">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                      <ComposedChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.08)"
                        />
                        <XAxis dataKey="label" />
                        <YAxis
                          tickFormatter={value =>
                            value.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                              notation: "compact",
                            })
                          }
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) =>
                                formatCurrency(Number(value))
                              }
                              labelFormatter={(_, payload) =>
                                payload?.[0]?.payload?.mes
                                  ? formatMonthLabel(payload[0].payload.mes)
                                  : ""
                              }
                            />
                          }
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar
                          dataKey="competencia"
                          fill="var(--chart-1)"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="receitas"
                          fill="var(--chart-2)"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="despesas"
                          fill="var(--chart-4)"
                          radius={[6, 6, 0, 0]}
                        />
                        <Line
                          type="monotone"
                          dataKey="resultado"
                          stroke="var(--chart-3)"
                          strokeWidth={3}
                          dot={{ r: 3 }}
                        />
                      </ComposedChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card className="panel-card">
                  <CardHeader>
                    <CardTitle>Saldos Bancários</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {resumo.caixa.saldosContas.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                        Nenhum saldo disponível. Verifique o token ou o host da
                        API do Procfy.
                      </div>
                    )}

                    {resumo.caixa.saldosContas.length > 0 && (() => {
                      const saldoTotal = resumo.caixa.saldosContas.reduce(
                        (acc, item) => acc + item.saldo,
                        0
                      );
                      return (
                        <div
                          className={`rounded-2xl border px-4 py-3 ${
                            saldoTotal >= 0
                              ? "border-emerald-500/30 bg-emerald-500/10"
                              : "border-rose-500/30 bg-rose-500/10"
                          }`}
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Caixa Total
                          </div>
                          <div
                            className={`mt-1 text-2xl font-bold ${
                              saldoTotal >= 0 ? "text-emerald-300" : "text-rose-300"
                            }`}
                          >
                            {formatCurrency(saldoTotal)}
                          </div>
                        </div>
                      );
                    })()}

                    {resumo.caixa.saldosContas.map(item => (
                      <div
                        key={item.conta}
                        className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3"
                      >
                        <div className="text-sm text-muted-foreground">
                          {item.conta}
                        </div>
                        <div
                          className={`mt-1 text-xl font-semibold ${
                            item.saldo < 0 ? "text-rose-300" : "text-foreground"
                          }`}
                        >
                          {formatCurrency(item.saldo)}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
                <Card className="panel-card">
                  <CardHeader>
                    <CardTitle>DRE Simplificado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Accordion type="multiple" className="w-full">
                      {[
                        {
                          key: "revenue",
                          label: "Receitas",
                          total: resumo.caixa.totalReceitas,
                        },
                        {
                          key: "fixed_expense",
                          label: "Despesas Fixas",
                          total:
                            dreGroups
                              .get("fixed_expense")
                              ?.reduce((acc, item) => acc + item.valor, 0) ?? 0,
                        },
                        {
                          key: "variable_expense",
                          label: "Despesas Variáveis",
                          total:
                            dreGroups
                              .get("variable_expense")
                              ?.reduce((acc, item) => acc + item.valor, 0) ?? 0,
                        },
                        {
                          key: "payroll",
                          label: "Folha de Pagamento",
                          total: resumo.caixa.totalFolha,
                        },
                        {
                          key: "tax",
                          label: "Impostos",
                          total: resumo.caixa.totalImpostos,
                        },
                      ].map(section => (
                        <AccordionItem value={section.key} key={section.key}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex w-full items-center justify-between gap-4">
                              <span>{section.label}</span>
                              <span className="font-semibold text-foreground">
                                {formatCurrency(section.total)}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-2">
                            {(dreGroups.get(section.key) ?? []).length === 0 && (
                              <div className="text-sm text-muted-foreground">
                                Sem lançamentos no período.
                              </div>
                            )}
                            {(dreGroups.get(section.key) ?? []).map(item => {
                              const pctReceita =
                                resumo.caixa.totalReceitas > 0
                                  ? item.valor / resumo.caixa.totalReceitas
                                  : 0;
                              return (
                                <div
                                  key={`${section.key}-${item.categoria}`}
                                  className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm"
                                >
                                  <span className="text-muted-foreground">
                                    {item.categoria}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground">
                                      {formatPercent(pctReceita)} da receita
                                    </span>
                                    <span className="font-medium text-foreground">
                                      {formatCurrency(item.valor)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>

                    <div className="rounded-2xl border border-border/60 bg-secondary/40 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Total de Custos
                        </span>
                        <div className="flex items-center gap-3">
                          {resumo.caixa.totalReceitas > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {formatPercent(
                                (resumo.caixa.totalDespesas +
                                  resumo.caixa.totalFolha +
                                  resumo.caixa.totalImpostos) /
                                  resumo.caixa.totalReceitas
                              )}{" "}
                              da receita
                            </span>
                          )}
                          <span className="text-base font-semibold text-foreground">
                            {formatCurrency(
                              resumo.caixa.totalDespesas +
                                resumo.caixa.totalFolha +
                                resumo.caixa.totalImpostos
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`rounded-2xl border px-4 py-4 ${
                        resumo.caixa.resultadoLiquido >= 0
                          ? "border-emerald-500/25 bg-emerald-500/10"
                          : "border-rose-500/25 bg-rose-500/10"
                      }`}
                    >
                      <div
                        className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                          resumo.caixa.resultadoLiquido >= 0
                            ? "text-emerald-300/90"
                            : "text-rose-300/90"
                        }`}
                      >
                        Resultado
                      </div>
                      <div
                        className={`mt-2 text-2xl font-semibold ${
                          resumo.caixa.resultadoLiquido < 0
                            ? "text-rose-300"
                            : "text-foreground"
                        }`}
                      >
                        {formatCurrency(resumo.caixa.resultadoLiquido)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="panel-card">
                  <CardHeader>
                    <CardTitle>Mix de Competência</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Por Produto
                      </div>
                      {resumo.competencia.porProduto.map((item, i) => (
                        <div
                          key={item.produto}
                          className="rounded-xl border border-border/60 px-3 py-2 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="truncate text-sm text-foreground">
                                {item.produto}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatPercent(item.pct)}
                              </div>
                            </div>
                            <div className="text-sm font-medium text-foreground">
                              {formatCurrency(item.valor)}
                            </div>
                          </div>
                          <AnimatedProgressBar
                            value={item.pct * 100}
                            height="xs"
                            colorClass="bg-primary/70"
                            delay={i * 0.05}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Por Vendedor
                      </div>
                      {resumo.competencia.porVendedor.map((item, i) => (
                        <div
                          key={item.vendedor}
                          className="rounded-xl border border-border/60 px-3 py-2 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="truncate text-sm text-foreground">
                                {item.vendedor}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatPercent(item.pct)}
                              </div>
                            </div>
                            <div className="text-sm font-medium text-foreground">
                              {formatCurrency(item.valor)}
                            </div>
                          </div>
                          <AnimatedProgressBar
                            value={item.pct * 100}
                            height="xs"
                            colorClass="bg-chart-2/70"
                            delay={i * 0.05}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="panel-card">
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <CardTitle>Drilldown de Transações</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={tipo}
                        onValueChange={value => {
                          startTransition(() => {
                            setTipo(value as "revenue" | "expense" | "all");
                            setPage(1);
                          });
                        }}
                      >
                        <SelectTrigger className="w-[140px] rounded-xl border-border/70 bg-background/80">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="revenue">Receitas</SelectItem>
                          <SelectItem value="expense">Despesas</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        value={categoria}
                        onChange={event => {
                          startTransition(() => {
                            setCategoria(event.target.value);
                            setPage(1);
                          });
                        }}
                        list="financeiro-categorias"
                        className="w-[180px] rounded-xl border-border/70 bg-background/80"
                        placeholder="Categoria"
                      />
                      <datalist id="financeiro-categorias">
                        {categoryOptions.map(option => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>

                      <Select
                        value={conta || "__all__"}
                        onValueChange={value => {
                          startTransition(() => {
                            setConta(value === "__all__" ? "" : value);
                            setPage(1);
                          });
                        }}
                      >
                        <SelectTrigger className="w-[160px] rounded-xl border-border/70 bg-background/80">
                          <SelectValue placeholder="Conta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todas as contas</SelectItem>
                          {accountOptions.map(option => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {(tipo !== "all" || categoria !== "" || conta !== "") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            startTransition(() => {
                              setTipo("all");
                              setCategoria("");
                              setConta("");
                              setPage(1);
                            });
                          }}
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                          Limpar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Contato</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Conta</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drilldown?.data.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="py-10 text-center text-muted-foreground"
                            >
                              Nenhuma transação encontrada para os filtros
                              atuais.
                            </TableCell>
                          </TableRow>
                        )}

                        {drilldown?.data.map(row => (
                          <TableRow key={row.id}>
                            <TableCell>
                              {row.dataPagamento
                                ? new Date(
                                    `${row.dataPagamento}T00:00:00`
                                  ).toLocaleDateString("pt-BR")
                                : "-"}
                            </TableCell>
                            <TableCell className="max-w-[18rem]">
                              <div className="truncate font-medium text-foreground">
                                {row.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getTypeLabel(row.tipo)} · {row.metodoPagamento}
                              </div>
                            </TableCell>
                            <TableCell>{row.contato}</TableCell>
                            <TableCell>{row.categoria}</TableCell>
                            <TableCell>{row.conta}</TableCell>
                            <TableCell>{formatCurrency(row.valor)}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  row.pago
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                }
                              >
                                {row.pago ? "Pago" : "Pendente"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      {drilldown?.total ?? 0} transações no recorte
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(current => Math.max(1, current - 1))}
                        disabled={page <= 1}
                      >
                        Página anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage(current =>
                            drilldown && current < drilldown.totalPages
                              ? current + 1
                              : current
                          )
                        }
                        disabled={!drilldown || page >= drilldown.totalPages}
                      >
                        Próxima página
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function Financeiro() {
  return (
    <DashboardLayout>
      <FinanceiroContent />
    </DashboardLayout>
  );
}
