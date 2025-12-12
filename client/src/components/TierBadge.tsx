import React from "react";
import { Trophy, Award, Star, Crown, Gem, Zap, Sparkles, Diamond } from "lucide-react";

interface TierBadgeProps {
  tier: string; // "Bronze", "Prata", "Ouro", "Platina", "Brilhante", "Diamante", "Mestre", "Lendário"
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animate?: boolean;
}

const TIER_CONFIG: Record<
  string,
  {
    name: string;
    emoji: string;
    icon: typeof Trophy;
    color: string;
    bgColor: string;
    multiplicador: number;
  }
> = {
  Bronze: {
    name: "Bronze",
    emoji: "🥉",
    icon: Award,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    multiplicador: 0.0,
  },
  Prata: {
    name: "Prata",
    emoji: "🥈",
    icon: Star,
    color: "text-gray-300",
    bgColor: "bg-gray-300/10",
    multiplicador: 0.5,
  },
  Ouro: {
    name: "Ouro",
    emoji: "🥇",
    icon: Trophy,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    multiplicador: 1.0,
  },
  Platina: {
    name: "Platina",
    emoji: "💎",
    icon: Gem,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    multiplicador: 1.5,
  },
  Brilhante: {
    name: "Brilhante",
    emoji: "✨",
    icon: Sparkles,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    multiplicador: 2.0,
  },
  Diamante: {
    name: "Diamante",
    emoji: "🔷",
    icon: Diamond,
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    multiplicador: 2.5,
  },
  Mestre: {
    name: "Mestre",
    emoji: "👑",
    icon: Crown,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    multiplicador: 3.0,
  },
  Lendário: {
    name: "Lendário",
    emoji: "⚡",
    icon: Zap,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    multiplicador: 3.5,
  },
};

export default function TierBadge({ tier, size = "md", showLabel = true, animate = false }: TierBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG["Bronze"];
  const Icon = config.icon;

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
        className={`${sizeClasses[size]} ${config.bgColor} ${config.color} rounded-full flex items-center justify-center font-bold ${
          animate ? "animate-pulse" : ""
        }`}
      >
        <Icon size={iconSizes[size]} />
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className={`font-semibold ${config.color}`}>
            {config.emoji} {config.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {config.multiplicador === 0 ? "Sem incentivo" : `${config.multiplicador.toFixed(1)}x`}
          </span>
        </div>
      )}
    </div>
  );
}
