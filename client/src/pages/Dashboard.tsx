import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VendedoraCard } from "@/components/VendedoraCard";
import TierBadge from "@/components/TierBadge";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EscadaAcelerador } from "@/components/EscadaAcelerador";
import { GraficosAnalise } from "@/components/GraficosAnalise";
import { useAudio } from "@/contexts/AudioContext";

export default function Dashboard() {
  const { data, isLoading, refetch } = trpc.dashboard.obterDashboard.useQuery(
    undefined,
    {
      refetchInterval: 60000, // Atualiza a cada 60 segundos
    }
  );

  const { celebrate, celebrateMetaAlcancada, celebrateSuperMeta } = useCelebration();
  const { playSale, playMeta, playSuperMeta, muted, toggleMute } = useAudio();
  const celebrationRef = useRef({ meta: false, superMeta: false });
  const lastContractsRef = useRef<number>(0);
  const lastContractsPorVendedoraRef = useRef<Map<string, number>>(new Map());
  const saleCelebrationTimeout = useRef<NodeJS.Timeout | null>(null);
  const [saleCelebration, setSaleCelebration] = useState<{ nome: string; id: string } | null>(null);

  useEffect(() => {
    if (!data) return;

    if (!celebrationRef.current.superMeta && data.metaGlobal.superMetaGlobalBatida) {
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
  }, [data, celebrateMetaAlcancada, celebrateSuperMeta, playMeta, playSuperMeta]);

  useEffect(() => {
    if (!data) return;
    if (lastContractsRef.current && data.totalContratos > lastContractsRef.current) {
      playSale();
    }
    lastContractsRef.current = data.totalContratos;

    // Detecta novas vendas por vendedora para disparar confete nominal
    const prevMap = lastContractsPorVendedoraRef.current;
    const deltas: { id: string; nome: string; delta: number }[] = [];
    data.vendedoras.forEach((v) => {
      const anterior = prevMap.get(v.id) ?? v.contratos.length;
      const delta = v.contratos.length - anterior;
      if (delta > 0) {
        deltas.push({ id: v.id, nome: v.nome, delta });
      }
    });

    const nextMap = new Map<string, number>();
    data.vendedoras.forEach((v) => nextMap.set(v.id, v.contratos.length));
    lastContractsPorVendedoraRef.current = nextMap;

    if (deltas.length > 0) {
      const destaque = deltas[0];
      if (saleCelebrationTimeout.current) {
        clearTimeout(saleCelebrationTimeout.current);
      }
      setSaleCelebration({ nome: destaque.nome, id: destaque.id });
      celebrate("small");
      saleCelebrationTimeout.current = setTimeout(() => {
        setSaleCelebration(null);
      }, 2000);
    }
  }, [data, playSale, celebrate]);

  useEffect(() => {
    return () => {
      if (saleCelebrationTimeout.current) {
        clearTimeout(saleCelebrationTimeout.current);
      }
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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
  const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioDaSemana = new Date(inicioDoDia);
  const diasParaSegunda = (agora.getDay() + 6) % 7; // 0 = domingo -> 6, 1 = segunda -> 0
  inicioDaSemana.setDate(inicioDaSemana.getDate() - diasParaSegunda);

  const somarRealizadoDesde = (contratos: any[] | undefined, dataInicio: Date) => {
    if (!contratos?.length) return 0;
    return contratos.reduce((acc, contrato) => {
      const dataPag = new Date(contrato.dataPagamento);
      return dataPag >= dataInicio && dataPag <= agora ? acc + (contrato.valorLiquido || 0) : acc;
    }, 0);
  };

  const getFaltaParaProximoAcelerador = () => {
    if (!data) return null;
    const { metaGlobal } = data;

    if (!metaGlobal.metaGlobalBatida) {
      if (metaGlobal.percentualMeta >= 75) {
        return { target: "100%", falta: metaGlobal.faltaMeta };
      }
      const falta = metaGlobal.metaValor * 0.75 - metaGlobal.realizado;
      return { target: "75%", falta };
    }

    if (!metaGlobal.superMetaGlobalBatida && metaGlobal.superMetaValor > 0) {
      return { target: "Super Meta", falta: metaGlobal.faltaSuperMeta };
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Erro ao carregar dados</p>
      </div>
    );
  }

  const faltaAcelerador = getFaltaParaProximoAcelerador();
  const ranking = data.ranking.map((vendedora) => {
    const realizadoDia = somarRealizadoDesde(vendedora.contratos, inicioDoDia);
    const realizadoSemana = somarRealizadoDesde(vendedora.contratos, inicioDaSemana);
    return { ...vendedora, realizadoDia, realizadoSemana };
  });

  const realizadoDiaGlobal = data.vendedoras.reduce(
    (acc, v) => acc + somarRealizadoDesde(v.contratos, inicioDoDia),
    0
  );
  const realizadoSemanaGlobal = data.vendedoras.reduce(
    (acc, v) => acc + somarRealizadoDesde(v.contratos, inicioDaSemana),
    0
  );
  const metaDiariaGlobal =
    data.operacional?.diasUteis && data.operacional.diasUteis > 0
      ? data.metaGlobal.metaValor / data.operacional.diasUteis
      : 0;
  const metaSemanalGlobal =
    data.operacional?.semanasPlanejadas && data.operacional.semanasPlanejadas > 0
      ? data.metaGlobal.metaValor / data.operacional.semanasPlanejadas
      : 0;

  const pctDiaGlobal = metaDiariaGlobal > 0 ? (realizadoDiaGlobal / metaDiariaGlobal) * 100 : 0;
  const pctSemanaGlobal =
    metaSemanalGlobal > 0 ? (realizadoSemanaGlobal / metaSemanalGlobal) * 100 : 0;

  const getProgressTone = (pct: number) => {
    if (pct >= 100) return "bg-green-500";
    if (pct >= 75) return "bg-amber-400";
    return "bg-primary";
  };

  const getProgressTextColor = (pct: number) => {
    if (pct >= 100) return "text-green-500";
    if (pct >= 75) return "text-amber-500";
    return "text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      {saleCelebration && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1.05, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative px-8 py-6 rounded-3xl shadow-2xl bg-gradient-to-br from-primary/90 via-primary to-purple-700/90 text-white flex flex-col items-center gap-2 border border-white/10"
          >
            <span className="text-sm uppercase tracking-[0.2em] text-white/80">
              Venda fechada!
            </span>
            <div className="text-3xl font-extrabold drop-shadow-sm">
              {saleCelebration.nome}
            </div>
            <div className="h-1 w-24 bg-white/50 rounded-full" />
            <span className="text-sm text-white/80">+ energia no time 🔥</span>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Painel de Vendas Opta</h1>
                <p className="text-muted-foreground mt-1">
                  {new Date().toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="gap-2"
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  {muted ? "Áudio off" : "Áudio on"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = "/tv"}
                  className="gap-2"
                >
                <Target size={16} />
                Modo TV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = "/admin"}
                className="gap-2"
              >
                <Users size={16} />
                Admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw size={16} />
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* KPIs Globais */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
          {/* Realizado Global */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Realizado Global
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.metaGlobal.realizado)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Meta: {formatCurrency(data.metaGlobal.metaValor)}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* % da Meta Global */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">% da Meta</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.metaGlobal.percentualMeta.toFixed(1)}%
                </div>
                {faltaAcelerador && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Faltam {formatCurrency(faltaAcelerador.falta)} para{" "}
                    {faltaAcelerador.target}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Super Meta Global */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Super Meta</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.metaGlobal.superMetaValor > 0
                    ? `${data.metaGlobal.percentualSuperMeta.toFixed(1)}%`
                    : "--"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Super Meta:{" "}
                  {data.metaGlobal.superMetaValor > 0
                    ? formatCurrency(data.metaGlobal.superMetaValor)
                    : "Não definida"}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Acelerador Global */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Acelerador Global
                </CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${getAceleradorColor(
                    data.metaGlobal.acelerador
                  )}`}
                >
                  {data.metaGlobal.acelerador > 0
                    ? `+${(data.metaGlobal.acelerador * 100).toFixed(0)}%`
                    : "0%"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getAceleradorLabel(data.metaGlobal.acelerador)}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total de Contratos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contratos</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalContratos}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.vendedoras.length} vendedoras ativas
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sem incentivo: {data.contratosSemComissao} (
                  {data.percentualContratosSemComissao.toFixed(1)}%)
                </p>
                <p className="text-xs text-muted-foreground">
                  Com incentivo: {data.contratosComComissao}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="mb-6 space-y-3">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap size={18} />
                Escada de Aceleradores (≥75% habilita)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <EscadaAcelerador steps={data.metaGlobal.escada} realizado={data.metaGlobal.realizado} />
              {faltaAcelerador && (
                <p className="text-xs text-muted-foreground">
                  Falta {formatCurrency(faltaAcelerador.falta)} para {faltaAcelerador.target}.
                  Acelerador só impacta vendedoras com 75%+ da meta individual.
                </p>
              )}
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <SunMedium size={14} />
                    Ritmo Diário
                  </div>
                  <span className={`font-semibold ${getProgressTextColor(pctDiaGlobal)}`}>
                    {pctDiaGlobal.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>{formatCurrency(realizadoDiaGlobal)}</span>
                  <span className="text-muted-foreground">
                    Meta {formatCurrency(metaDiariaGlobal)}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${getProgressTone(pctDiaGlobal)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pctDiaGlobal, 140)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {metaDiariaGlobal > 0
                    ? pctDiaGlobal >= 100
                      ? "Dia batido! Hora de acelerar a semana."
                      : `Faltam ${formatCurrency(Math.max(0, metaDiariaGlobal - realizadoDiaGlobal))} para fechar o dia.`
                    : "Defina dias úteis para calcular o ritmo diário."}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarRange size={14} />
                    Ritmo Semanal
                  </div>
                  <span className={`font-semibold ${getProgressTextColor(pctSemanaGlobal)}`}>
                    {pctSemanaGlobal.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>{formatCurrency(realizadoSemanaGlobal)}</span>
                  <span className="text-muted-foreground">
                    Meta {formatCurrency(metaSemanalGlobal)}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${getProgressTone(pctSemanaGlobal)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pctSemanaGlobal, 140)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {metaSemanalGlobal > 0
                    ? pctSemanaGlobal >= 100
                      ? "Semana batida! Avance para a supermeta."
                      : `Faltam ${formatCurrency(Math.max(0, metaSemanalGlobal - realizadoSemanaGlobal))} para fechar a semana.`
                    : "Defina semanas planejadas para calcular o ritmo semanal."}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Valor em liberação (fora do incentivo)</p>
                <p className="text-xl font-bold">{formatCurrency(data.valorEmLiberacao || 0)}</p>
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
            <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-center gap-3">
                  <Zap className="text-green-400" size={24} />
                  <span className="text-lg font-bold text-green-400">
                    Acelerador Global Ativo! Todas as vendedoras (75%+) ganham{" "}
                    {getAceleradorLabel(data.metaGlobal.acelerador)}
                  </span>
                  <Zap className="text-green-400" size={24} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Grid de Vendedoras */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users size={28} />
              Vendedoras
            </h2>
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
              />
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy size={24} />
                Ranking do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ranking.slice(0, 10).map((vendedora, index) => (
                  <div
                    key={vendedora.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="text-2xl font-bold w-8 text-center">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{vendedora.nome}</div>
                      <div className="text-sm text-muted-foreground">
                        {vendedora.percentualMeta.toFixed(1)}% da meta •{" "}
                        {formatCurrency(vendedora.realizado)}
                      </div>
                    </div>
                    <TierBadge tier={vendedora.tier} size="sm" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Produtos e Pipeline */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Produtos & Pipeline</h2>
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
