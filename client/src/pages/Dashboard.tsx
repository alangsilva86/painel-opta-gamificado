import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VendedoraCard } from "@/components/VendedoraCard";
import TierBadge from "@/components/TierBadge";
import { KpiCard } from "@/components/KpiCard";
import { AnimatedProgressBar } from "@/components/AnimatedProgressBar";
import { useCelebration } from "@/hooks/useCelebration";
import {
  Target,
  TrendingUp,
  DollarSign,
  Users,
  Zap,
  Trophy,
  RefreshCw,
  Volume2,
  VolumeX,
  Shield,
  SunMedium,
  CalendarRange,
  Clock3,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EscadaAcelerador } from "@/components/EscadaAcelerador";
import { GraficosAnalise } from "@/components/GraficosAnalise";
import { useAudio } from "@/contexts/AudioContext";
import {
  cn,
  formatCurrency,
  getProgressBarColor,
  getProgressColor,
} from "@/lib/utils";
import { getTierDefinition, getTierVisual } from "@/lib/tierVisuals";
import { VendedoraDetalheModal } from "@/components/VendedoraDetalheModal";

function getMotivationalMessage(percentualMeta: number) {
  if (percentualMeta >= 150)
    return "Super meta consolidada. Mantenha a cadência.";
  if (percentualMeta >= 100)
    return "Meta batida. Direcione a energia para a super meta.";
  if (percentualMeta >= 75) return "Reta final da meta global.";
  return "Mês em construção. Priorize ritmo e consistência.";
}

function getDayProgressTone(dayPct: number) {
  if (dayPct >= 75) return "from-rose-500 via-amber-400 to-yellow-300";
  if (dayPct >= 45) return "from-amber-400 via-yellow-300 to-lime-300";
  return "from-emerald-500 via-green-400 to-lime-300";
}

function DashboardHeaderStatus({ percentualMeta }: { percentualMeta: number }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const dayPct = Math.max(0, Math.min(((hour - 8) / 10) * 100, 100));

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="status-chip border-primary/20 bg-primary/10 text-foreground">
          <Sparkles size={14} className="text-primary" />
          <span>{getMotivationalMessage(percentualMeta)}</span>
        </div>
        <div className="status-chip font-mono text-muted-foreground">
          <Clock3 size={14} />
          <span>{now.toLocaleTimeString("pt-BR")}</span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Progresso do dia</span>
          <span>{dayPct.toFixed(0)}%</span>
        </div>
        <div className="h-[3px] overflow-hidden rounded-full bg-secondary">
          <motion.div
            className={cn(
              "h-full bg-gradient-to-r",
              getDayProgressTone(dayPct)
            )}
            animate={{ width: `${dayPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

function getLeaderboardRankBadge(index: number) {
  return `#${String(index + 1).padStart(2, "0")}`;
}

function getLeaderboardBorder(index: number) {
  if (index === 0) return "border-l-yellow-400";
  if (index === 1) return "border-l-gray-300";
  if (index === 2) return "border-l-orange-400";
  return "border-l-transparent";
}

export default function Dashboard() {
  const { data, isLoading, refetch } = trpc.dashboard.obterDashboard.useQuery(
    undefined,
    {
      refetchInterval: 60000, // Atualiza a cada 60 segundos
    }
  );

  const {
    celebrate,
    celebrateMetaAlcancada,
    celebrateSuperMeta,
    celebrateLevelUp,
  } = useCelebration();
  const { playSale, playMeta, playSuperMeta, muted, toggleMute } = useAudio();
  const celebrationRef = useRef({ meta: false, superMeta: false });
  const lastContractsRef = useRef<number>(0);
  const lastSaleAudioAtRef = useRef<number>(0);
  const lastSaleCelebrationAtRef = useRef<number>(0);
  const lastContractsPorVendedoraRef = useRef<Map<string, number>>(new Map());
  const lastTierRef = useRef<Map<string, string>>(new Map());
  const [saleCelebration, setSaleCelebration] = useState<{
    nome: string;
    id: string;
  } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedVendedora, setSelectedVendedora] = useState<any | null>(null);
  const [selectedRank, setSelectedRank] = useState<number | undefined>(
    undefined
  );

  const handleCloseSelectedVendedora = () => {
    setSelectedVendedora(null);
    setSelectedRank(undefined);
  };

  useEffect(() => {
    if (!data) return;

    if (
      !celebrationRef.current.superMeta &&
      data.metaGlobal.superMetaGlobalBatida
    ) {
      celebrateSuperMeta();
      playSuperMeta();
      celebrationRef.current = { meta: true, superMeta: true };
      return;
    }

    if (!celebrationRef.current.meta && data.metaGlobal.metaGlobalBatida) {
      celebrateMetaAlcancada();
      playMeta();
      celebrationRef.current.meta = true;
    }
  }, [
    data,
    celebrateMetaAlcancada,
    celebrateSuperMeta,
    playMeta,
    playSuperMeta,
  ]);

  useEffect(() => {
    if (!data) return;
    const now = Date.now();
    const prevTierMap = lastTierRef.current;

    let hasLevelUp = false;
    const nextTierMap = new Map<string, string>();
    data.vendedoras.forEach(v => {
      nextTierMap.set(v.id, v.tier);
      const prevTier = prevTierMap.get(v.id);
      if (
        prevTier &&
        getTierDefinition(v.tier).multiplicador >
          getTierDefinition(prevTier).multiplicador
      ) {
        hasLevelUp = true;
      }
    });
    lastTierRef.current = nextTierMap;

    if (hasLevelUp) {
      celebrateLevelUp();
    }

    if (
      lastContractsRef.current &&
      data.totalContratos > lastContractsRef.current
    ) {
      if (now - lastSaleAudioAtRef.current > 3000) {
        playSale();
        lastSaleAudioAtRef.current = now;
      }
    }
    lastContractsRef.current = data.totalContratos;

    // Detecta novas vendas por vendedora para disparar confete nominal
    const prevMap = lastContractsPorVendedoraRef.current;
    const deltas: { id: string; nome: string; delta: number }[] = [];
    data.vendedoras.forEach(v => {
      const anterior = prevMap.get(v.id) ?? v.contratos.length;
      const delta = v.contratos.length - anterior;
      if (delta > 0) {
        deltas.push({ id: v.id, nome: v.nome, delta });
      }
    });

    const nextMap = new Map<string, number>();
    data.vendedoras.forEach(v => nextMap.set(v.id, v.contratos.length));
    lastContractsPorVendedoraRef.current = nextMap;

    if (deltas.length > 0 && now - lastSaleCelebrationAtRef.current > 5000) {
      const destaque = deltas[0];
      setSaleCelebration({ nome: destaque.nome, id: destaque.id });
      celebrate("small");
      lastSaleCelebrationAtRef.current = now;
    }
  }, [data, playSale, celebrate, celebrateLevelUp]);

  const getAceleradorLabel = (acelerador: number) => {
    if (acelerador >= 0.5) return "+50% Acelerador Global";
    if (acelerador >= 0.25) return "+25% Acelerador Global";
    return "Sem acelerador";
  };

  const getAceleradorColor = (acelerador: number) => {
    if (acelerador >= 0.5) return "text-green-400";
    if (acelerador >= 0.25) return "text-yellow-400";
    return "text-muted-foreground";
  };

  const agora = new Date();
  const inicioDoDia = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate()
  );
  const inicioDaSemana = new Date(inicioDoDia);
  const diasParaSegunda = (agora.getDay() + 6) % 7; // 0 = domingo -> 6, 1 = segunda -> 0
  inicioDaSemana.setDate(inicioDaSemana.getDate() - diasParaSegunda);

  const parseDataPagamento = (dataPagamento: string) => {
    if (!dataPagamento) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataPagamento);
    if (match) {
      const [, year, month, day] = match;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
    const parsed = new Date(dataPagamento);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const somarRealizadoDesde = (
    contratos: any[] | undefined,
    dataInicio: Date
  ) => {
    if (!contratos?.length) return 0;
    return contratos.reduce((acc, contrato) => {
      const dataPag = parseDataPagamento(contrato.dataPagamento);
      if (!dataPag) return acc;
      return dataPag >= dataInicio && dataPag <= agora
        ? acc + (contrato.valorLiquido || 0)
        : acc;
    }, 0);
  };

  const getFaltaParaProximoAcelerador = () => {
    if (!data) return null;
    const { metaGlobal } = data;

    if (!metaGlobal.metaGlobalBatida) {
      return { target: "Meta Global", falta: metaGlobal.faltaMeta };
    }

    if (!metaGlobal.superMetaGlobalBatida && metaGlobal.superMetaValor > 0) {
      return { target: "Super Meta", falta: metaGlobal.faltaSuperMeta };
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <RefreshCw className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando dashboard…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Erro ao carregar dados</p>
      </div>
    );
  }

  const faltaAcelerador = getFaltaParaProximoAcelerador();
  const ranking = data.ranking.map(vendedora => {
    const realizadoDia =
      typeof vendedora.realizadoDia === "number"
        ? vendedora.realizadoDia
        : somarRealizadoDesde(vendedora.contratos, inicioDoDia);
    const realizadoSemana =
      typeof vendedora.realizadoSemana === "number"
        ? vendedora.realizadoSemana
        : somarRealizadoDesde(vendedora.contratos, inicioDaSemana);
    return { ...vendedora, realizadoDia, realizadoSemana };
  });

  const realizadoDiaGlobal =
    typeof data.realizadoDiaGlobal === "number"
      ? data.realizadoDiaGlobal
      : data.vendedoras.reduce((acc, v) => {
          const valor =
            typeof v.realizadoDia === "number"
              ? v.realizadoDia
              : somarRealizadoDesde(v.contratos, inicioDoDia);
          return acc + valor;
        }, 0);
  const realizadoSemanaGlobal =
    typeof data.realizadoSemanaGlobal === "number"
      ? data.realizadoSemanaGlobal
      : data.vendedoras.reduce((acc, v) => {
          const valor =
            typeof v.realizadoSemana === "number"
              ? v.realizadoSemana
              : somarRealizadoDesde(v.contratos, inicioDaSemana);
          return acc + valor;
        }, 0);
  const metaDiariaGlobal =
    data.operacional?.diasUteis && data.operacional.diasUteis > 0
      ? data.metaGlobal.metaValor / data.operacional.diasUteis
      : 0;
  const metaSemanalGlobal =
    data.operacional?.semanasPlanejadas &&
    data.operacional.semanasPlanejadas > 0
      ? data.metaGlobal.metaValor / data.operacional.semanasPlanejadas
      : 0;

  const pctDiaGlobal =
    metaDiariaGlobal > 0 ? (realizadoDiaGlobal / metaDiariaGlobal) * 100 : 0;
  const pctSemanaGlobal =
    metaSemanalGlobal > 0
      ? (realizadoSemanaGlobal / metaSemanalGlobal) * 100
      : 0;

  const leaderboardVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const leaderboardItemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="page-shell">
      {saleCelebration && (
        <button
          type="button"
          onClick={() => setSaleCelebration(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1.05, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative flex flex-col items-center gap-2 rounded-3xl border border-white/10 bg-gradient-to-br from-primary/90 via-primary to-sky-600/90 px-8 py-6 text-white shadow-2xl"
          >
            <span className="text-sm uppercase tracking-[0.2em] text-white/80">
              Venda confirmada
            </span>
            <div className="text-3xl font-extrabold drop-shadow-sm">
              {saleCelebration.nome}
            </div>
            <div className="h-1 w-24 bg-white/50 rounded-full" />
            <span className="text-sm text-white/80">Clique para fechar</span>
          </motion.div>
        </button>
      )}

      {/* Header */}
      <div className="page-content">
        <div className="page-hero px-6 py-6">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="metric-label">Performance comercial</div>
              <h1 className="mt-2 text-4xl font-black tracking-tight">
                Painel de Vendas Opta
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {new Date().toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
                {" · "}Monitoramento do mês, ritmo e aceleração por vendedora
              </p>
              <DashboardHeaderStatus
                percentualMeta={data.metaGlobal.percentualMeta}
              />
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="gap-2 rounded-xl"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                {muted ? "Áudio off" : "Áudio on"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/tv")}
                className="gap-2 rounded-xl border-white/10 bg-background/70"
              >
                <Target size={16} />
                Modo TV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/admin")}
                className="gap-2 rounded-xl border-white/10 bg-background/70"
              >
                <Users size={16} />
                Admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-2 rounded-xl border-white/10 bg-background/70"
              >
                <RefreshCw size={16} />
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content page-stack">
        {/* KPIs Globais */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            title="Realizado Global"
            value={formatCurrency(data.metaGlobal.realizado)}
            subtitle={`Meta: ${formatCurrency(data.metaGlobal.metaValor)}`}
            icon={DollarSign}
            progress={{
              value: data.metaGlobal.percentualMeta,
              colorClass: getProgressBarColor(data.metaGlobal.percentualMeta),
            }}
            motionDelay={0.1}
          />

          <KpiCard
            title="% da Meta"
            value={`${data.metaGlobal.percentualMeta.toFixed(1)}%`}
            subtitle={
              faltaAcelerador
                ? `Faltam ${formatCurrency(faltaAcelerador.falta)} para ${faltaAcelerador.target}`
                : undefined
            }
            icon={Target}
            progress={{
              value: data.metaGlobal.percentualMeta,
              colorClass: getProgressBarColor(data.metaGlobal.percentualMeta),
            }}
            motionDelay={0.2}
          />

          <KpiCard
            title="Super Meta"
            value={
              data.metaGlobal.superMetaValor > 0
                ? `${data.metaGlobal.percentualSuperMeta.toFixed(1)}%`
                : "--"
            }
            subtitle={`Super Meta: ${data.metaGlobal.superMetaValor > 0 ? formatCurrency(data.metaGlobal.superMetaValor) : "Não definida"}`}
            icon={Shield}
            motionDelay={0.25}
          />

          <KpiCard
            title="Acelerador Global"
            value={
              data.metaGlobal.acelerador > 0
                ? `+${(data.metaGlobal.acelerador * 100).toFixed(0)}%`
                : "0%"
            }
            valueClassName={getAceleradorColor(data.metaGlobal.acelerador)}
            subtitle={
              data.metaGlobal.acelerador > 0
                ? getAceleradorLabel(data.metaGlobal.acelerador)
                : faltaAcelerador
                  ? `Faltam ${formatCurrency(faltaAcelerador.falta)}`
                  : getAceleradorLabel(data.metaGlobal.acelerador)
            }
            icon={Zap}
            motionDelay={0.3}
          />

          <KpiCard
            title="Contratos"
            value={data.totalContratos}
            icon={TrendingUp}
            motionDelay={0.4}
          >
            <p className="mt-1 text-xs text-muted-foreground">
              {data.vendedoras.length} vendedoras ativas
            </p>
            <p className="text-xs text-muted-foreground">
              Sem incentivo: {data.contratosSemComissao} (
              {data.percentualContratosSemComissao.toFixed(1)}%)
            </p>
            <p className="text-xs text-muted-foreground">
              Com incentivo: {data.contratosComComissao}
            </p>
          </KpiCard>
        </div>

        <div className="mb-6 space-y-3">
          <Card className="panel-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap size={18} />
                Escada Global: Meta e Super Meta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <EscadaAcelerador
                steps={data.metaGlobal.escada}
                realizado={data.metaGlobal.realizado}
              />
              {faltaAcelerador && (
                <p className="text-xs text-muted-foreground">
                  Falta {formatCurrency(faltaAcelerador.falta)} para{" "}
                  {faltaAcelerador.target}. O acelerador global só impacta
                  vendedoras com 75%+ da meta individual.
                </p>
              )}
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="panel-card">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <SunMedium size={14} />
                    Ritmo Diário
                  </div>
                  <span
                    className={cn(
                      "font-semibold",
                      getProgressColor(pctDiaGlobal)
                    )}
                  >
                    {pctDiaGlobal.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>{formatCurrency(realizadoDiaGlobal)}</span>
                  <span className="text-muted-foreground">
                    Meta {formatCurrency(metaDiariaGlobal)}
                  </span>
                </div>
                <AnimatedProgressBar
                  value={pctDiaGlobal}
                  colorClass={getProgressBarColor(pctDiaGlobal)}
                  height="md"
                />
                <p className="text-xs text-muted-foreground">
                  {metaDiariaGlobal > 0
                    ? pctDiaGlobal >= 100
                      ? "Dia batido! Hora de acelerar a semana."
                      : `Faltam ${formatCurrency(Math.max(0, metaDiariaGlobal - realizadoDiaGlobal))} para fechar o dia.`
                    : "Defina dias úteis para calcular o ritmo diário."}
                </p>
              </CardContent>
            </Card>
            <Card className="panel-card">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarRange size={14} />
                    Ritmo Semanal
                  </div>
                  <span
                    className={cn(
                      "font-semibold",
                      getProgressColor(pctSemanaGlobal)
                    )}
                  >
                    {pctSemanaGlobal.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>{formatCurrency(realizadoSemanaGlobal)}</span>
                  <span className="text-muted-foreground">
                    Meta {formatCurrency(metaSemanalGlobal)}
                  </span>
                </div>
                <AnimatedProgressBar
                  value={pctSemanaGlobal}
                  colorClass={getProgressBarColor(pctSemanaGlobal)}
                  height="md"
                />
                <p className="text-xs text-muted-foreground">
                  {metaSemanalGlobal > 0
                    ? pctSemanaGlobal >= 100
                      ? "Semana batida! Avance para a supermeta."
                      : `Faltam ${formatCurrency(Math.max(0, metaSemanalGlobal - realizadoSemanaGlobal))} para fechar a semana.`
                    : "Defina semanas planejadas para calcular o ritmo semanal."}
                </p>
              </CardContent>
            </Card>
            <Card className="panel-card">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">
                  Valor em liberação (fora do incentivo)
                </p>
                <p className="text-xl font-bold">
                  {formatCurrency(data.valorEmLiberacao || 0)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Banner de Acelerador Ativo */}
        {data.metaGlobal.acelerador > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <Card className="panel-card border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10">
              <CardContent className="py-4">
                <div className="flex items-center justify-center gap-3">
                  <Zap className="text-green-400" size={24} />
                  <span className="text-lg font-bold text-green-400">
                    Acelerador Global Ativo! Vendedoras com 75%+ da meta
                    individual ganham{" "}
                    {getAceleradorLabel(data.metaGlobal.acelerador)}
                  </span>
                  <Zap className="text-green-400" size={24} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Grid de Vendedoras */}
        <div className="page-section">
          <div className="page-section-header">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight">
                <Users size={28} />
                Vendedoras
              </h2>
              <p className="page-section-copy mt-2">
                Ranking vivo, ritmo e potencial de incentivo por pessoa.
              </p>
            </div>
            <Badge variant="secondary" className="text-sm">
              {data.vendedoras.length} ativas
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ranking.map((vendedora, index) => (
              <VendedoraCard
                key={vendedora.id}
                vendedora={vendedora}
                rank={index + 1}
                onClick={() => {
                  setSelectedVendedora(vendedora);
                  setSelectedRank(index + 1);
                }}
              />
            ))}
          </div>

          <VendedoraDetalheModal
            vendedora={selectedVendedora}
            rank={selectedRank}
            open={selectedVendedora !== null}
            onClose={handleCloseSelectedVendedora}
          />
        </div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="panel-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy size={24} />
                Ranking do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <motion.div
                className="space-y-3"
                variants={leaderboardVariants}
                initial="hidden"
                animate="show"
              >
                {ranking.slice(0, 10).map((vendedora, index) => (
                  <motion.div
                    key={vendedora.id}
                    variants={leaderboardItemVariants}
                    className={cn(
                      "flex items-center gap-4 rounded-lg border-l-4 bg-secondary/50 p-3",
                      getLeaderboardBorder(index)
                    )}
                  >
                    <div className="w-12 text-center text-lg font-black tracking-[0.16em] text-muted-foreground">
                      {getLeaderboardRankBadge(index)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">{vendedora.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          {vendedora.percentualMeta.toFixed(1)}%
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {formatCurrency(vendedora.realizado)}
                      </div>
                      <AnimatedProgressBar
                        value={vendedora.percentualMeta}
                        colorClass={cn(
                          getTierVisual(vendedora.tier).softBgClass,
                          index === 0 && "bg-yellow-400",
                          index === 1 && "bg-white/60",
                          index === 2 && "bg-orange-400"
                        )}
                        className="mt-2 bg-background/70"
                        delay={index * 0.05}
                      />
                    </div>
                    <TierBadge tier={vendedora.tier} size="sm" />
                  </motion.div>
                ))}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Produtos e Pipeline */}
        <div className="page-section">
          <div className="page-section-header">
            <div>
              <h2 className="text-2xl font-black tracking-tight">
                Produtos & Pipeline
              </h2>
              <p className="page-section-copy mt-2">
                Leitura tática da produção, concentração e avanço operacional.
              </p>
            </div>
          </div>
          <GraficosAnalise
            produtos={data.produtos || []}
            pipeline={data.pipeline || []}
            totalComissao={data.totalComissao || 0}
            totalValorPipeline={data.totalValorPipeline || 0}
          />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Última atualização:{" "}
          {new Date(data.ultimaAtualizacao).toLocaleTimeString("pt-BR")}
        </div>
      </div>
    </div>
  );
}
