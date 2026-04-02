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
import { AnimatedProgressBar } from "./AnimatedProgressBar";
import {
  Trophy,
  TrendingUp,
  DollarSign,
  Zap,
  SunMedium,
  CalendarRange,
  Lock,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatCurrency, getProgressBarColor } from "@/lib/utils";
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
    baseComissionavelTotal: number;
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
    className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  },
  "Supermeta 150%": {
    className: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  },
  "Supermeta 200%": {
    className: "bg-red-500/20 text-red-300 border-red-500/40",
  },
  "Hat-trick": {
    className: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  },
  Imparável: {
    className: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  },
  Dominante: {
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

function getRankColor(rank: number | undefined): string {
  if (!rank) return "";
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-gray-300";
  if (rank === 3) return "text-orange-400";
  return "text-muted-foreground";
}

export function VendedoraCard({
  vendedora,
  rank,
  onClick,
}: VendedoraCardProps) {
  const renderRitmoCard = (
    label: string,
    icon: ReactNode,
    realizado: number,
    metaPlanejada: number
  ) => {
    const pct = metaPlanejada > 0 ? (realizado / metaPlanejada) * 100 : 0;
    const falta = Math.max(0, metaPlanejada - realizado);
    const statusLabel =
      metaPlanejada <= 0
        ? "Sem meta"
        : falta === 0
          ? "No alvo"
          : `Gap ${formatCurrency(falta)}`;

    return (
      <div className="rounded-xl border border-white/10 bg-background/40 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            {icon}
            <span>{label}</span>
          </div>
          <span className="font-semibold tabular-nums text-foreground">
            {metaPlanejada > 0 ? `${pct.toFixed(0)}%` : "Sem meta"}
          </span>
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-3">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(realizado)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Meta {formatCurrency(metaPlanejada)}
          </span>
        </div>
        <AnimatedProgressBar
          value={pct}
          colorClass={getProgressBarColor(pct)}
          height="sm"
          className="mt-2 bg-background/70"
        />
        <div
          className={cn(
            "mt-1.5 text-[10px] uppercase tracking-[0.14em]",
            falta === 0 && metaPlanejada > 0
              ? "text-emerald-300"
              : "text-muted-foreground"
          )}
        >
          {statusLabel}
        </div>
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
  const metaConfigured = vendedora.meta > 0;
  const isEligibleForIncentive = tierDefinition.multiplicador > 0;
  const showAceleradorPill =
    isEligibleForIncentive && (vendedora.aceleradorAplicado || 0) > 0;
  const acceleratorFactor = 1 + (vendedora.aceleradorAplicado || 0);
  const incentiveMilestones = [75, 100].map(threshold => {
    const milestoneTier = getTierByThreshold(threshold);
    const milestoneVisual = getTierVisual(milestoneTier.nome);
    const unlocked = vendedora.percentualMeta >= threshold;
    const missingPct = Math.max(0, threshold - vendedora.percentualMeta);

    return {
      threshold,
      tierName: milestoneTier.nome,
      visual: milestoneVisual,
      unlocked,
      missingPct,
      amount:
        vendedora.baseComissionavelTotal *
        milestoneTier.multiplicador *
        acceleratorFactor,
    };
  });
  const nextIncentiveMilestone = metaConfigured
    ? (incentiveMilestones.find(milestone => !milestone.unlocked) ?? null)
    : null;
  const incentiveProgress = metaConfigured
    ? Math.min(100, Math.max(0, vendedora.percentualMeta))
    : 0;
  const incentiveHeadline = !metaConfigured
    ? "Meta pendente"
    : isEligibleForIncentive
      ? formatCurrency(vendedora.comissaoPrevista)
      : nextIncentiveMilestone
        ? formatCurrency(nextIncentiveMilestone.amount)
        : formatCurrency(vendedora.comissaoPrevista);
  const incentiveContextLabel = !metaConfigured
    ? "Defina a meta para ativar a escada"
    : isEligibleForIncentive
      ? nextIncentiveMilestone
        ? `Ativo · mira ${nextIncentiveMilestone.threshold}%`
        : "Escada concluída"
      : nextIncentiveMilestone
        ? `Destrava em ${nextIncentiveMilestone.threshold}%`
        : "Escada base pronta";
  const incentiveFooterLabel = !metaConfigured
    ? "Meta do mês não definida"
    : nextIncentiveMilestone
      ? `Faltam ${nextIncentiveMilestone.missingPct.toFixed(0)} p.p.`
      : "75% e 100% destravados";
  const incentiveMetaChip = !metaConfigured
    ? "Sem meta"
    : `${vendedora.percentualMeta.toFixed(0)}%`;
  const pendingFinanceLabel =
    vendedora.contratosSemComissao > 0
      ? `${vendedora.contratosSemComissao} aguard. financeiro`
      : null;
  const bannerClass =
    vendedora.percentualMeta >= 150
      ? "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-background"
      : "bg-gradient-to-r from-emerald-500 to-cyan-400 text-white";

  const cardBody = (
    <Card
      className={cn(
        "panel-card-strong relative overflow-hidden border bg-card/95 text-left transition-[box-shadow,border-color,transform]",
        tierVisual.cardClass,
        onClick &&
          "focus-visible:ring-primary/60 focus-visible:ring-2 focus-visible:ring-offset-2"
      )}
    >
      {/* Ranking badge */}
      {rank && rank <= 3 && (
        <div className="absolute top-2 right-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-1 font-bold text-lg",
                  getRankColor(rank)
                )}
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
          <div className={cn("banner-strip", bannerClass)}>
            <span>Meta alcançada</span>
            <span>{vendedora.percentualMeta.toFixed(0)}%</span>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Avatar placeholder */}
          <div className="flex-shrink-0">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-sky-500 text-2xl font-bold text-white">
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Escada do incentivo
                    </div>
                    {showAceleradorPill && (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-300"
                      >
                        + acel.
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
                    {metaConfigured ? (
                      isEligibleForIncentive ? (
                        <DollarSign
                          size={16}
                          className={tierVisual.textClass}
                        />
                      ) : (
                        <Lock size={16} className="text-muted-foreground" />
                      )
                    ) : (
                      <Lock size={16} className="text-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        "text-lg font-black tracking-tight tabular-nums",
                        metaConfigured && isEligibleForIncentive
                          ? tierVisual.textClass
                          : "text-foreground"
                      )}
                    >
                      {incentiveHeadline}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {incentiveContextLabel}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 rounded-xl border border-white/10 bg-background/50 px-3 py-2 text-right">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Progresso
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground tabular-nums">
                    {incentiveMetaChip}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="relative px-1 pb-3 pt-1">
                  <div className="h-1.5 rounded-full bg-white/10" />
                  <div
                    className={cn(
                      "absolute left-0 top-1 h-1.5 rounded-full bg-gradient-to-r",
                      nearThreshold
                        ? "from-amber-400 to-yellow-300"
                        : "from-primary/80 to-sky-400"
                    )}
                    style={{ width: `${incentiveProgress}%` }}
                  />
                  {incentiveMilestones.map(milestone => {
                    const isNextTarget =
                      nextIncentiveMilestone?.threshold === milestone.threshold;

                    return (
                      <div
                        key={`marker-${milestone.threshold}`}
                        className="absolute top-[2px] -translate-x-1/2"
                        style={{ left: `${milestone.threshold}%` }}
                      >
                        <div
                          className={cn(
                            "h-3.5 w-3.5 rounded-full border-2 bg-background shadow-[0_0_0_4px_rgba(10,14,23,0.45)]",
                            milestone.unlocked
                              ? "border-transparent bg-emerald-400"
                              : isNextTarget
                                ? "border-primary"
                                : "border-white/20"
                          )}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {incentiveMilestones.map(milestone => {
                    const isNextTarget =
                      nextIncentiveMilestone?.threshold === milestone.threshold;

                    return (
                      <div
                        key={milestone.threshold}
                        className={cn(
                          "rounded-xl border px-3 py-2",
                          milestone.unlocked
                            ? `${milestone.visual.softBgClass} border-white/5`
                            : isNextTarget
                              ? "border-primary/30 bg-primary/10"
                              : "border-white/10 bg-background/45"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">
                                {milestone.threshold}%
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] uppercase tracking-[0.14em]",
                                  milestone.unlocked
                                    ? milestone.visual.textClass
                                    : isNextTarget
                                      ? "text-primary"
                                      : "text-muted-foreground"
                                )}
                              >
                                {milestone.tierName}
                              </span>
                            </div>
                            <div className="mt-1 text-sm font-black tracking-tight text-foreground tabular-nums">
                              {formatCurrency(milestone.amount)}
                            </div>
                          </div>
                          {milestone.unlocked && (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0 text-[9px] uppercase tracking-[0.14em] text-emerald-300"
                            >
                              Ativo
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span
                  className={cn(
                    nearThreshold
                      ? "font-semibold text-amber-300"
                      : "text-muted-foreground"
                  )}
                >
                  {incentiveFooterLabel}
                </span>
                {pendingFinanceLabel && (
                  <span className="text-muted-foreground">
                    {pendingFinanceLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/5 bg-background/35 px-3 py-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-white/8 bg-background/40 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Realizado
                    </div>
                    <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(vendedora.realizado)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-background/40 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Meta
                    </div>
                    <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(vendedora.meta)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-background/40 px-3 py-2">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      <TrendingUp size={11} />
                      Contratos
                    </div>
                    <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                      <AnimatedContractCount
                        value={vendedora.contratos.length}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                  <span className="uppercase tracking-[0.16em] text-muted-foreground">
                    Meta do mês
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {vendedora.percentualMeta.toFixed(1)}%
                  </span>
                </div>
                <AnimatedProgressBar
                  value={vendedora.percentualMeta}
                  colorClass={getProgressBarColor(vendedora.percentualMeta)}
                  height="sm"
                  className="mt-2 bg-background/70"
                />

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  {proximoNivel ? (
                    <>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1",
                          nearThreshold
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                            : "border-white/10 bg-background/45 text-muted-foreground"
                        )}
                      >
                        <Zap size={11} className="text-yellow-400" />
                        Próximo {proximoNivel.label}
                      </span>
                      <span
                        className={cn(
                          "tabular-nums",
                          nearThreshold
                            ? "font-semibold text-amber-300"
                            : "text-muted-foreground"
                        )}
                      >
                        Faltam {formatCurrency(proximoNivel.falta)}
                      </span>
                    </>
                  ) : (
                    <span className="text-emerald-300">
                      Escada principal concluída
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {renderRitmoCard(
                  "Hoje",
                  <SunMedium size={12} className="text-foreground" />,
                  vendedora.realizadoDia || 0,
                  vendedora.metaDiariaPlanejada || 0
                )}
                {renderRitmoCard(
                  "Semana",
                  <CalendarRange size={12} className="text-foreground" />,
                  vendedora.realizadoSemana || 0,
                  vendedora.metaSemanalPlanejada || 0
                )}
              </div>
            </div>

            {/* Badges */}
            {vendedora.badges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {vendedora.badges.slice(0, 2).map(badge => (
                  <Tooltip key={badge}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className={cn(
                          "cursor-default text-[10px] uppercase tracking-[0.12em]",
                          BADGE_STYLE[badge as keyof typeof BADGE_STYLE]
                            ?.className
                        )}
                      >
                        {badge}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {BADGE_DESCRICOES[badge] || "Conquista desbloqueada"}
                    </TooltipContent>
                  </Tooltip>
                ))}
                {vendedora.badges.length > 2 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase tracking-[0.12em]"
                  >
                    +{vendedora.badges.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Progress ring */}
          <div className="self-center pt-1 sm:self-start sm:flex-shrink-0">
            <ProgressRing
              progress={vendedora.percentualMeta}
              size={92}
              strokeWidth={6}
              showPercentage
              label="meta"
              tierColor={tierVisual.accentColor}
            />
          </div>
        </div>

        {onClick && (
          <div className="mt-3 flex justify-end">
            <span className="status-chip border-border/70 bg-background/60 text-muted-foreground">
              <Eye size={11} />
              ver análise
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

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
      whileHover={onClick ? { scale: 1.02 } : undefined}
      className="rounded-2xl"
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-haspopup="dialog"
          aria-label={`Abrir análise detalhada de ${vendedora.nome}`}
          className="block w-full rounded-2xl cursor-pointer text-left touch-manipulation focus-visible:outline-none"
        >
          {cardBody}
        </button>
      ) : (
        <div className="cursor-default">{cardBody}</div>
      )}
    </motion.div>
  );
}
