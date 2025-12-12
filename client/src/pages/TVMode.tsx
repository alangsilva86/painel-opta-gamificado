import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { ProgressRing } from "@/components/ProgressRing";
import TierBadge from "@/components/TierBadge";
import { Trophy, Zap, Target, TrendingUp } from "lucide-react";

export default function TVMode() {
  const { data, refetch } = trpc.dashboard.obterDashboard.useQuery(undefined, {
    refetchInterval: 30000, // Atualiza a cada 30 segundos no modo TV
  });

  const [currentView, setCurrentView] = useState<"overview" | "ranking">("overview");

  // Alterna entre visões a cada 15 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentView((prev) => (prev === "overview" ? "ranking" : "overview"));
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

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-4xl text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      {/* Header fixo */}
      <div className="mb-8">
        <div className="text-center mb-6">
          <h1 className="text-6xl font-bold mb-2">Painel de Vendas Opta</h1>
          <p className="text-2xl text-muted-foreground">
            {new Date().toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* KPIs em destaque */}
        <div className="grid grid-cols-5 gap-6 mb-6">
          <motion.div
            className="bg-card rounded-2xl p-6 text-center border-2 border-border"
            whileHover={{ scale: 1.05 }}
          >
            <div className="text-muted-foreground text-xl mb-2">Realizado</div>
            <div className="text-5xl font-bold text-green-400">
              {formatCurrency(data.metaGlobal.realizado)}
            </div>
          </motion.div>

          <motion.div
            className="bg-card rounded-2xl p-6 text-center border-2 border-border"
            whileHover={{ scale: 1.05 }}
          >
            <div className="text-muted-foreground text-xl mb-2">% da Meta</div>
            <div className="text-5xl font-bold text-blue-400">
              {data.metaGlobal.percentualMeta.toFixed(1)}%
            </div>
          </motion.div>

          <motion.div
            className="bg-card rounded-2xl p-6 text-center border-2 border-border"
            whileHover={{ scale: 1.05 }}
          >
            <div className="text-muted-foreground text-xl mb-2">Super Meta</div>
            <div className="text-5xl font-bold text-purple-400">
              {data.metaGlobal.superMetaValor > 0
                ? data.metaGlobal.percentualSuperMeta.toFixed(1) + "%"
                : "--"}
            </div>
          </motion.div>

          <motion.div
            className="bg-card rounded-2xl p-6 text-center border-2 border-border"
            whileHover={{ scale: 1.05 }}
          >
            <div className="text-muted-foreground text-xl mb-2 flex items-center justify-center gap-2">
              <Zap size={24} />
              Acelerador
            </div>
            <div
              className={`text-5xl font-bold ${
                data.metaGlobal.acelerador > 0 ? "text-yellow-400" : "text-gray-500"
              }`}
            >
              {data.metaGlobal.acelerador > 0
                ? `+${(data.metaGlobal.acelerador * 100).toFixed(0)}%`
                : "0%"}
            </div>
          </motion.div>

          <motion.div
            className="bg-card rounded-2xl p-6 text-center border-2 border-border"
            whileHover={{ scale: 1.05 }}
          >
            <div className="text-muted-foreground text-xl mb-2">Contratos</div>
            <div className="text-5xl font-bold text-purple-400">
              {data.totalContratos}
            </div>
          </motion.div>
        </div>

        {/* Banner de acelerador */}
        {data.metaGlobal.acelerador > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 rounded-2xl p-6 text-center"
          >
            <div className="flex items-center justify-center gap-4 text-3xl font-bold text-green-400">
              <Zap size={40} />
              <span>
                Acelerador Global Ativo! Vendedoras 75%+ ganham +
                {(data.metaGlobal.acelerador * 100).toFixed(0)}%
              </span>
              <Zap size={40} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Conteúdo alternado */}
      <AnimatePresence mode="wait">
        {currentView === "overview" ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl font-bold mb-6 flex items-center gap-3">
              <Target size={40} />
              Top Vendedoras
            </h2>
            <div className="grid grid-cols-3 gap-6">
              {data.ranking.slice(0, 6).map((vendedora, index) => (
                <motion.div
                  key={vendedora.id}
                  className="bg-card rounded-2xl p-6 border-2 border-border relative overflow-hidden"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Ranking badge */}
                  {index < 3 && (
                    <div className="absolute top-4 right-4">
                      <div
                        className={`flex items-center gap-2 text-2xl font-bold ${
                          index === 0
                            ? "text-yellow-400"
                            : index === 1
                            ? "text-gray-300"
                            : "text-orange-400"
                        }`}
                      >
                        <Trophy size={32} />
                        <span>#{index + 1}</span>
                      </div>
                    </div>
                  )}

                  {/* Fita de meta alcançada */}
                  {vendedora.percentualMeta >= 100 && (
                    <div className="absolute top-6 -left-10 bg-green-500 text-white px-16 py-2 text-sm font-bold transform -rotate-45 shadow-lg">
                      META
                    </div>
                  )}

                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                      {vendedora.nome.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-bold truncate mb-2">
                        {vendedora.nome}
                      </h3>
                      <TierBadge tier={vendedora.tier} size="md" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Realizado</div>
                      <div className="text-xl font-bold">
                        {formatCurrency(vendedora.realizado)}
                      </div>
                    </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Incentivo</div>
                    <div className="text-xl font-bold text-green-400">
                      {formatCurrency(vendedora.comissaoPrevista)}
                    </div>
                  </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <ProgressRing
                      progress={vendedora.percentualMeta}
                      size={80}
                      strokeWidth={6}
                    />
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Contratos</div>
                      <div className="text-3xl font-bold">
                        {vendedora.contratos.length}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="ranking"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl font-bold mb-6 flex items-center gap-3">
              <Trophy size={40} />
              Ranking Completo
            </h2>
            <div className="space-y-4">
              {data.ranking.map((vendedora, index) => (
                <motion.div
                  key={vendedora.id}
                  className="bg-card rounded-2xl p-6 border-2 border-border"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-center gap-6">
                    <div className="text-5xl font-bold w-16 text-center">
                      {index + 1}
                    </div>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                      {vendedora.nome.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="text-2xl font-bold">{vendedora.nome}</div>
                      <div className="text-lg text-muted-foreground">
                        {vendedora.percentualMeta.toFixed(1)}% da meta •{" "}
                        {formatCurrency(vendedora.realizado)}
                      </div>
                    </div>
                    <TierBadge tier={vendedora.tier} size="lg" />
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Comissão</div>
                      <div className="text-2xl font-bold text-green-400">
                        {formatCurrency(vendedora.comissaoPrevista)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="fixed bottom-4 right-4 text-xl text-muted-foreground">
        Atualização:{" "}
        {new Date(data.ultimaAtualizacao).toLocaleTimeString("pt-BR")}
      </div>
    </div>
  );
}
