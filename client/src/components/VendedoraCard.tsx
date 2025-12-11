import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "./ProgressRing";
import TierBadge from "./TierBadge";
import { Trophy, TrendingUp, DollarSign, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VendedoraCardProps {
  vendedora: {
    id: string;
    nome: string;
    realizado: number;
    meta: number;
    percentualMeta: number;
    tier: string;
    comissaoPrevista: number;
    contratos: any[];
    badges: string[];
    metaDiariaPlanejada?: number;
    metaSemanalPlanejada?: number;
    escada?: {
      label: string;
      falta: number;
      percentual: number;
      alvo: number;
      atingido: boolean;
    }[];
    aceleradorAplicado?: number;
  };
  rank?: number;
  onClick?: () => void;
}

const BADGE_DESCRICOES: Record<string, string> = {
  "Meta 100%": "Bateu 100% da meta individual",
  "Supermeta 150%": "Chegou a 150% da meta",
  "Supermeta 200%": "Passou de 200% da meta",
  "Hat-trick": "3 contratos no mesmo dia",
  "Imparável": "5 contratos no mesmo dia",
  "Dominante": "10 contratos no mesmo dia",
};

export function VendedoraCard({ vendedora, rank, onClick }: VendedoraCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getRankColor = () => {
    if (!rank) return "";
    if (rank === 1) return "text-yellow-400";
    if (rank === 2) return "text-gray-300";
    if (rank === 3) return "text-orange-400";
    return "text-muted-foreground";
  };

  const proximoNivel = vendedora.escada?.find((step) => !step.atingido);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
        {/* Fita de meta alcançada */}
        {vendedora.percentualMeta >= 100 && (
          <motion.div
            initial={{ x: -100 }}
            animate={{ x: 0 }}
            className="absolute top-4 -left-8 bg-green-500 text-white px-12 py-1 text-xs font-bold transform -rotate-45 shadow-lg"
          >
            META ALCANÇADA
          </motion.div>
        )}

        {/* Ranking badge */}
        {rank && rank <= 3 && (
          <div className="absolute top-2 right-2">
            <div
              className={`flex items-center gap-1 ${getRankColor()} font-bold text-lg`}
            >
              <Trophy size={20} />
              <span>#{rank}</span>
            </div>
          </div>
        )}

        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Avatar placeholder */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {vendedora.nome.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold truncate">{vendedora.nome}</h3>
              <div className="flex items-center gap-2 mt-1">
                <TierBadge tier={vendedora.tier} size="sm" />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <div className="text-xs text-muted-foreground">Realizado</div>
                  <div className="text-sm font-semibold">
                    {formatCurrency(vendedora.realizado)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Meta</div>
                  <div className="text-sm font-semibold">
                    {formatCurrency(vendedora.meta)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign size={12} />
                    Comissão {vendedora.aceleradorAplicado ? "(+acel.)" : ""}
                  </div>
                  <div className="text-sm font-semibold text-green-400">
                    {formatCurrency(vendedora.comissaoPrevista)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp size={12} />
                    Contratos
                  </div>
                  <div className="text-sm font-semibold">
                    {vendedora.contratos.length}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-semibold">
                    {vendedora.percentualMeta.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${
                      vendedora.percentualMeta >= 100
                        ? "bg-green-500"
                        : vendedora.percentualMeta >= 75
                        ? "bg-yellow-500"
                        : "bg-primary"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(vendedora.percentualMeta, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Metas operacionais */}
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs text-muted-foreground">
                <div>
                  Meta diária
                  <div className="text-sm font-semibold text-foreground">
                    {formatCurrency(vendedora.metaDiariaPlanejada || 0)}
                  </div>
                </div>
                <div>
                  Meta semanal
                  <div className="text-sm font-semibold text-foreground">
                    {formatCurrency(vendedora.metaSemanalPlanejada || 0)}
                  </div>
                </div>
              </div>

              {proximoNivel && (
                <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
                  <Zap size={12} className="text-yellow-400" />
                  Próximo nível {proximoNivel.label}: faltam {formatCurrency(proximoNivel.falta)}
                </div>
              )}

              {/* Badges */}
              {vendedora.badges.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {vendedora.badges.slice(0, 3).map((badge) => (
                    <Tooltip key={badge}>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-xs cursor-default">
                          {badge}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {BADGE_DESCRICOES[badge] || "Conquista desbloqueada"}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {vendedora.badges.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{vendedora.badges.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Progress ring */}
            <div className="flex-shrink-0">
              <ProgressRing
                progress={vendedora.percentualMeta}
                size={100}
                strokeWidth={6}
                showPercentage={false}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
