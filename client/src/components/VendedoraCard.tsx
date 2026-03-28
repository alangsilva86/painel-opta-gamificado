import { type ReactNode, useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
} from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "./ProgressRing";
import TierBadge from "./TierBadge";
import {
  Trophy,
  TrendingUp,
  DollarSign,
  Zap,
  SunMedium,
  CalendarRange,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  getTierByThreshold,
  getTierDefinition,
  getTierVisual,
} from "@/lib/tierVisuals";

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
    contratosSemComissao: number;
    badges: string[];
    metaDiariaPlanejada?: number;
    metaSemanalPlanejada?: number;
    realizadoDia?: number;
    realizadoSemana?: number;
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
  Imparável: "5 contratos no mesmo dia",
  Dominante: "10 contratos no mesmo dia",
};

const BADGE_STYLE = {
  "Meta 100%": {
    emoji: "🏅",
    className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  },
  "Supermeta 150%": {
    emoji: "🔥",
    className: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  },
  "Supermeta 200%": {
    emoji: "💥",
    className: "bg-red-500/20 text-red-300 border-red-500/40",
  },
  "Hat-trick": {
    emoji: "🎯",
    className: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  },
  Imparável: {
    emoji: "⚡",
    className: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  },
  Dominante: {
    emoji: "👑",
    className: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
} as const;

function AnimatedContractCount({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const motionValue = useMotionValue(value);
  const springValue = useSpring(motionValue, { stiffness: 100, damping: 20 });
  const roundedValue = useTransform(springValue, latest => Math.round(latest));

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  useMotionValueEvent(roundedValue, "change", latest => {
    setDisplayValue(latest);
  });

  return <motion.span>{displayValue}</motion.span>;
}

export function VendedoraCard({
  vendedora,
  rank,
  onClick,
}: VendedoraCardProps) {
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

  const getBarColor = (pct: number) => {
    if (pct >= 100) return "bg-green-500";
    if (pct >= 75) return "bg-amber-400";
    return "bg-primary";
  };

  const renderRitmoLinha = (
    label: string,
    icon: ReactNode,
    realizado: number,
    metaPlanejada: number
  ) => {
    const pct = metaPlanejada > 0 ? (realizado / metaPlanejada) * 100 : 0;
    const falta = Math.max(0, metaPlanejada - realizado);

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {icon}
            <span>{label}</span>
          </div>
          <span className="font-semibold text-foreground">
            {pct.toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{formatCurrency(realizado)}</span>
          <span>Meta {formatCurrency(metaPlanejada)}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${getBarColor(pct)}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(pct, 140)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        {metaPlanejada > 0 && falta > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Faltam {formatCurrency(falta)} para fechar {label.toLowerCase()}.
          </p>
        )}
        {metaPlanejada > 0 && falta === 0 && (
          <p className="text-[11px] text-green-500">Ritmo batido!</p>
        )}
      </div>
    );
  };

  const proximoNivel = vendedora.escada?.find(step => !step.atingido);
  const tierDefinition = getTierDefinition(vendedora.tier);
  const tierVisual = getTierVisual(vendedora.tier);
  const nextTier = proximoNivel
    ? getTierByThreshold(proximoNivel.percentual)
    : null;
  const nextTierVisual = nextTier ? getTierVisual(nextTier.nome) : tierVisual;
  const nearThreshold =
    proximoNivel !== undefined &&
    proximoNivel.percentual > 0 &&
    vendedora.percentualMeta < proximoNivel.percentual &&
    1 - vendedora.percentualMeta / proximoNivel.percentual <= 0.05;
  const isEligibleForIncentive = tierDefinition.multiplicador > 0;
  const showAceleradorPill =
    isEligibleForIncentive && (vendedora.aceleradorAplicado || 0) > 0;
  const bannerClass =
    vendedora.percentualMeta >= 150
      ? "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950"
      : "bg-gradient-to-r from-green-500 to-emerald-400 text-white";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        boxShadow: nearThreshold
          ? [
              `0 0 0 rgba(0,0,0,0)`,
              nextTierVisual.glowShadow,
              `0 0 0 rgba(0,0,0,0)`,
            ]
          : "0 0 0 rgba(0,0,0,0)",
      }}
      transition={{
        opacity: { duration: 0.3 },
        y: { duration: 0.3 },
        boxShadow: nearThreshold
          ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.3 },
      }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="cursor-pointer rounded-2xl"
    >
      <Card
        className={cn(
          "relative overflow-hidden border bg-card/95 hover:shadow-lg transition-[box-shadow,border-color]",
          tierVisual.cardClass
        )}
      >
        {/* Ranking badge */}
        {rank && rank <= 3 && (
          <div className="absolute top-2 right-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`flex items-center gap-1 ${getRankColor()} font-bold text-lg`}
                >
                  <Trophy size={20} />
                  <span>#{rank}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">Top {rank} do mês</TooltipContent>
            </Tooltip>
          </div>
        )}

        <CardContent className="p-6">
          {vendedora.percentualMeta >= 100 && (
            <div
              className={cn(
                "-mx-6 -mt-6 mb-4 flex items-center justify-between px-4 py-2 text-xs font-bold",
                bannerClass
              )}
            >
              <span>META ALCANÇADA 🏆</span>
              <span>{vendedora.percentualMeta.toFixed(0)}%</span>
            </div>
          )}

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

              <div
                className={cn(
                  "mt-4 rounded-2xl border px-4 py-3",
                  tierVisual.softBgClass,
                  "border-white/5"
                )}
              >
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Comissão prevista
                </div>
                {isEligibleForIncentive ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <DollarSign size={18} className={tierVisual.textClass} />
                    <span
                      className={cn("text-xl font-black", tierVisual.textClass)}
                    >
                      {formatCurrency(vendedora.comissaoPrevista)}
                    </span>
                    {showAceleradorPill && (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      >
                        + acel.
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                    <Lock size={16} />
                    <span className="text-base font-semibold">
                      Sem incentivo
                    </span>
                  </div>
                )}
                {vendedora.contratosSemComissao > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {vendedora.contratosSemComissao} contratos sem incentivo no
                    período.
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
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
                    <TrendingUp size={12} />
                    Contratos
                  </div>
                  <div className="text-sm font-semibold">
                    <AnimatedContractCount value={vendedora.contratos.length} />
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
                    animate={{
                      width: `${Math.min(vendedora.percentualMeta, 100)}%`,
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  Ritmo operacional
                </div>
                {renderRitmoLinha(
                  "Hoje",
                  <SunMedium size={12} className="text-foreground" />,
                  vendedora.realizadoDia || 0,
                  vendedora.metaDiariaPlanejada || 0
                )}
                {renderRitmoLinha(
                  "Semana",
                  <CalendarRange size={12} className="text-foreground" />,
                  vendedora.realizadoSemana || 0,
                  vendedora.metaSemanalPlanejada || 0
                )}
              </div>

              {proximoNivel && (
                <div
                  className={cn(
                    "mt-3 text-xs flex items-center gap-2",
                    nearThreshold
                      ? "text-yellow-300 font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  <Zap size={12} className="text-yellow-400" />
                  Próximo nível {proximoNivel.label}: faltam{" "}
                  {formatCurrency(proximoNivel.falta)}
                  {nearThreshold && (
                    <Badge className="border-amber-500/50 bg-amber-500/15 text-amber-200">
                      QUASE LÁ!
                    </Badge>
                  )}
                </div>
              )}

              {/* Badges */}
              {vendedora.badges.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {vendedora.badges.slice(0, 3).map(badge => (
                    <Tooltip key={badge}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs cursor-default",
                            BADGE_STYLE[badge as keyof typeof BADGE_STYLE]
                              ?.className
                          )}
                        >
                          {BADGE_STYLE[badge as keyof typeof BADGE_STYLE]?.emoji
                            ? `${BADGE_STYLE[badge as keyof typeof BADGE_STYLE].emoji} `
                            : ""}
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
                showPercentage
                tierColor={tierVisual.accentColor}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
