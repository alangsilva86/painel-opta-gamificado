import {
  Award,
  Crown,
  Diamond,
  Gem,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { TIERS, type TierDefinition, type TierName } from "@shared/tiers";

interface TierBadgeProps {
  tier: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animate?: boolean;
}

const TIER_STYLE: Record<
  TierName,
  { icon: typeof Trophy; color: string; bgColor: string; borderColor: string }
> = {
  Bronze: {
    icon: Award,
    color: "text-amber-200",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/25",
  },
  Prata: {
    icon: Star,
    color: "text-zinc-200",
    bgColor: "bg-zinc-400/10",
    borderColor: "border-zinc-400/25",
  },
  Ouro: {
    icon: Trophy,
    color: "text-yellow-300",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/25",
  },
  Platina: {
    icon: Gem,
    color: "text-sky-300",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/25",
  },
  Brilhante: {
    icon: Sparkles,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/25",
  },
  Diamante: {
    icon: Diamond,
    color: "text-teal-300",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/25",
  },
  Mestre: {
    icon: Crown,
    color: "text-orange-300",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/25",
  },
  Lendário: {
    icon: Zap,
    color: "text-fuchsia-300",
    bgColor: "bg-fuchsia-500/10",
    borderColor: "border-fuchsia-500/25",
  },
};

const TIER_MAP = new Map<TierName, TierDefinition>();
TIERS.forEach(tier => {
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
        className={`${sizeClasses[size]} ${style.bgColor} ${style.borderColor} ${style.color} rounded-full border flex items-center justify-center font-bold ${
          animate ? "animate-pulse" : ""
        }`}
      >
        <Icon size={iconSizes[size]} />
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className={`font-semibold ${style.color}`}>{config.nome}</span>
          <span className="text-xs text-muted-foreground">
            {config.multiplicador === 0
              ? "Incentivo não liberado"
              : `${config.multiplicador.toFixed(1)}x`}
          </span>
        </div>
      )}
    </div>
  );
}
