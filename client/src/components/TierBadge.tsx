import React from "react";
import { Award, Crown, Diamond, Gem, Sparkles, Star, Trophy, Zap } from "lucide-react";
import { TIERS, type TierDefinition, type TierName } from "@shared/tiers";

interface TierBadgeProps {
  tier: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animate?: boolean;
}

const TIER_STYLE: Record<TierName, { icon: typeof Trophy; color: string; bgColor: string }> = {
  Bronze: {
    icon: Award,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
  },
  Prata: {
    icon: Star,
    color: "text-gray-300",
    bgColor: "bg-gray-300/10",
  },
  Ouro: {
    icon: Trophy,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
  Platina: {
    icon: Gem,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  Brilhante: {
    icon: Sparkles,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
  },
  Diamante: {
    icon: Diamond,
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
  },
  Mestre: {
    icon: Crown,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  Lendário: {
    icon: Zap,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
};

const TIER_MAP = new Map<TierName, TierDefinition>();
TIERS.forEach((tier) => {
  TIER_MAP.set(tier.nome, tier);
});

export default function TierBadge({
  tier,
  size = "md",
  showLabel = true,
  animate = false,
}: TierBadgeProps) {
  const config = TIER_MAP.get(tier as TierName) || TIER_MAP.get("Bronze")!;
  const style = TIER_STYLE[config.nome];
  const Icon = style.icon;

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} ${style.bgColor} ${style.color} rounded-full flex items-center justify-center font-bold ${
          animate ? "animate-pulse" : ""
        }`}
      >
        <Icon size={iconSizes[size]} />
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className={`font-semibold ${style.color}`}>
            {config.emoji} {config.nome}
          </span>
          <span className="text-xs text-muted-foreground">
            {config.multiplicador === 0 ? "Sem incentivo" : `${config.multiplicador.toFixed(1)}x`}
          </span>
        </div>
      )}
    </div>
  );
}
