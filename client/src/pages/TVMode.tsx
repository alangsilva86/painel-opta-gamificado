import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { ProgressRing } from "@/components/ProgressRing";
import TierBadge from "@/components/TierBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Zap, Target } from "lucide-react";

export default function TVMode() {
  const { data } = trpc.dashboard.obterDashboard.useQuery(undefined, {
    refetchInterval: 30000, // Atualiza a cada 30 segundos no modo TV
  });

  const [currentView, setCurrentView] = useState<"overview" | "ranking">(
    "overview"
  );

  // Alterna entre visões a cada 15 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentView(prev => (prev === "overview" ? "ranking" : "overview"));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const kpis = data
    ? [
        {
          label: "Realizado",
          value: formatCurrency(data.metaGlobal.realizado),
          tone: "text-emerald-300",
        },
        {
          label: "% da meta",
          value: `${data.metaGlobal.percentualMeta.toFixed(1)}%`,
          tone: "text-primary",
        },
        {
          label: "Super meta",
          value:
            data.metaGlobal.superMetaValor > 0
              ? `${data.metaGlobal.percentualSuperMeta.toFixed(1)}%`
              : "--",
          tone: "text-cyan-300",
        },
        {
          label: "Acelerador",
          value:
            data.metaGlobal.acelerador > 0
              ? `+${(data.metaGlobal.acelerador * 100).toFixed(0)}%`
              : "0%",
          tone:
            data.metaGlobal.acelerador > 0
              ? "text-amber-300"
              : "text-muted-foreground",
        },
        {
          label: "Contratos",
          value: String(data.totalContratos),
          tone: "text-foreground",
        },
      ]
    : [];

  if (!data) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center">
        <div className="panel-card-strong px-10 py-8 text-center">
          <div className="metric-label mb-3">TV Mode</div>
          <div className="text-4xl font-semibold text-foreground">
            Carregando painel...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col gap-8 px-6 py-8 xl:px-10">
        <section className="page-hero">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
              <div className="space-y-4">
                <div className="status-chip w-fit border-primary/25 bg-primary/10 text-primary">
                  TV Mode
                </div>
                <div className="space-y-3">
                  <h1 className="text-5xl font-semibold tracking-tight text-foreground 2xl:text-7xl">
                    Painel de vendas Opta
                  </h1>
                  <p className="text-xl text-muted-foreground 2xl:text-2xl">
                    {new Date().toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-sm 2xl:text-lg">
                <div className="status-chip border-border/70 bg-background/60 text-foreground">
                  Visão {currentView === "overview" ? "geral" : "ranking"}
                </div>
                <div className="status-chip border-border/70 bg-background/60 text-foreground">
                  Atualização{" "}
                  {new Date(data.ultimaAtualizacao).toLocaleTimeString(
                    "pt-BR",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              {kpis.map(kpi => (
                <Card
                  key={kpi.label}
                  className="panel-card-strong min-h-[180px]"
                >
                  <CardContent className="flex h-full flex-col justify-between p-6 2xl:p-7">
                    <div className="metric-label text-[0.72rem] 2xl:text-sm">
                      {kpi.label}
                    </div>
                    <div
                      className={`text-4xl font-semibold tracking-tight 2xl:text-6xl ${kpi.tone}`}
                    >
                      {kpi.value}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {data.metaGlobal.acelerador > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -24 }}
                animate={{ opacity: 1, y: 0 }}
                className="panel-card flex items-center justify-center rounded-[28px] border-emerald-500/30 bg-gradient-to-r from-emerald-500/12 via-background/90 to-cyan-500/12 px-8 py-6"
              >
                <div className="flex items-center gap-4 text-center text-2xl font-semibold text-emerald-100 2xl:text-4xl">
                  <Zap className="h-8 w-8 text-amber-300 2xl:h-10 2xl:w-10" />
                  <span>
                    Acelerador global ativo: vendedoras com 75%+ da meta
                    individual recebem +
                    {(data.metaGlobal.acelerador * 100).toFixed(0)}%.
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        <AnimatePresence mode="wait">
          {currentView === "overview" ? (
            <motion.section
              key="overview"
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -80 }}
              transition={{ duration: 0.45 }}
              className="space-y-6"
            >
              <div className="page-section-header items-end">
                <div>
                  <h2 className="flex items-center gap-3 text-3xl font-semibold text-foreground 2xl:text-5xl">
                    <Target className="h-8 w-8 text-primary 2xl:h-10 2xl:w-10" />
                    Top vendedoras
                  </h2>
                  <p className="page-section-copy text-base 2xl:text-xl">
                    Leitura rápida de liderança, progresso e incentivo previsto.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                {data.ranking.slice(0, 6).map((vendedora, index) => (
                  <motion.div
                    key={vendedora.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <Card className="panel-card-strong relative min-h-[320px] overflow-hidden">
                      {vendedora.percentualMeta >= 100 && (
                        <div className="absolute right-5 top-5 rounded-full border border-emerald-500/30 bg-emerald-500/12 px-4 py-1 text-sm font-medium uppercase tracking-[0.24em] text-emerald-200">
                          Meta atingida
                        </div>
                      )}
                      <CardContent className="flex h-full flex-col gap-6 p-6 2xl:p-8">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-4">
                            <div className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                              #{String(index + 1).padStart(2, "0")}
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border/70 bg-gradient-to-br from-primary/90 to-sky-400/70 text-3xl font-semibold text-primary-foreground 2xl:h-24 2xl:w-24">
                                {vendedora.nome.charAt(0)}
                              </div>
                              <div className="space-y-2">
                                <h3 className="text-2xl font-semibold text-foreground 2xl:text-3xl">
                                  {vendedora.nome}
                                </h3>
                                <TierBadge tier={vendedora.tier} size="md" />
                              </div>
                            </div>
                          </div>
                          {index < 3 && (
                            <div className="rounded-full border border-amber-500/30 bg-amber-500/12 p-3 text-amber-200">
                              <Trophy className="h-7 w-7 2xl:h-9 2xl:w-9" />
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="panel-inset rounded-2xl p-4">
                            <div className="metric-label">Realizado</div>
                            <div className="mt-2 text-xl font-semibold text-foreground 2xl:text-3xl">
                              {formatCurrency(vendedora.realizado)}
                            </div>
                          </div>
                          <div className="panel-inset rounded-2xl p-4">
                            <div className="metric-label">Incentivo</div>
                            <div className="mt-2 text-xl font-semibold text-emerald-300 2xl:text-3xl">
                              {formatCurrency(vendedora.comissaoPrevista)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto flex items-center justify-between gap-4">
                          <ProgressRing
                            progress={vendedora.percentualMeta}
                            size={96}
                            strokeWidth={7}
                          />
                          <div className="flex-1 text-right">
                            <div className="metric-label">Contratos</div>
                            <div className="mt-2 text-4xl font-semibold text-foreground 2xl:text-5xl">
                              {vendedora.contratos.length}
                            </div>
                            <div className="mt-1 text-lg text-muted-foreground 2xl:text-xl">
                              {vendedora.percentualMeta.toFixed(1)}% da meta
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="ranking"
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -80 }}
              transition={{ duration: 0.45 }}
              className="space-y-6"
            >
              <div className="page-section-header items-end">
                <div>
                  <h2 className="flex items-center gap-3 text-3xl font-semibold text-foreground 2xl:text-5xl">
                    <Trophy className="h-8 w-8 text-amber-300 2xl:h-10 2xl:w-10" />
                    Ranking completo
                  </h2>
                  <p className="page-section-copy text-base 2xl:text-xl">
                    Ordem atual de desempenho com meta, realizado e incentivo
                    previsto.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {data.ranking.map((vendedora, index) => (
                  <motion.div
                    key={vendedora.id}
                    className="table-shell"
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex flex-col gap-5 p-6 2xl:flex-row 2xl:items-center 2xl:gap-8 2xl:p-8">
                      <div className="flex items-center gap-5">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-3xl font-semibold text-foreground 2xl:h-20 2xl:w-20 2xl:text-4xl">
                          {index + 1}
                        </div>
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-gradient-to-br from-primary/90 to-sky-400/70 text-2xl font-semibold text-primary-foreground 2xl:h-20 2xl:w-20 2xl:text-3xl">
                          {vendedora.nome.charAt(0)}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="text-2xl font-semibold text-foreground 2xl:text-3xl">
                          {vendedora.nome}
                        </div>
                        <div className="text-lg text-muted-foreground 2xl:text-2xl">
                          {vendedora.percentualMeta.toFixed(1)}% da meta •{" "}
                          {formatCurrency(vendedora.realizado)}
                        </div>
                      </div>

                      <div className="2xl:min-w-[220px]">
                        <TierBadge tier={vendedora.tier} size="lg" />
                      </div>

                      <div className="grid flex-1 gap-4 sm:grid-cols-3">
                        <div className="panel-inset rounded-2xl p-4">
                          <div className="metric-label">Realizado</div>
                          <div className="mt-2 text-2xl font-semibold text-foreground 2xl:text-3xl">
                            {formatCurrency(vendedora.realizado)}
                          </div>
                        </div>
                        <div className="panel-inset rounded-2xl p-4">
                          <div className="metric-label">Incentivo</div>
                          <div className="mt-2 text-2xl font-semibold text-emerald-300 2xl:text-3xl">
                            {formatCurrency(vendedora.comissaoPrevista)}
                          </div>
                        </div>
                        <div className="panel-inset rounded-2xl p-4">
                          <div className="metric-label">Contratos</div>
                          <div className="mt-2 text-2xl font-semibold text-foreground 2xl:text-3xl">
                            {vendedora.contratos.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
