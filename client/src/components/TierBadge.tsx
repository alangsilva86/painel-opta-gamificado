import { motion } from "framer-motion";
import { Trophy, Award, Star, Crown, Gem, Zap, Sparkles } from "lucide-react";

interface TierBadgeProps {
  tier: number; // 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animate?: boolean;
}

const TIER_CONFIG: Record<
  number,
  {
    name: string;
    icon: typeof Trophy;
    color: string;
    bgColor: string;
  }
> = {
  0: {
    name: "Sem comissão",
    icon: Trophy,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
  },
  0.5: {
    name: "Bronze",
    icon: Award,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  1.0: {
    name: "Prata",
    icon: Star,
    color: "text-gray-300",
    bgColor: "bg-gray-300/10",
  },
  1.5: {
    name: "Ouro",
    icon: Trophy,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
  2.0: {
    name: "Platina",
    icon: Gem,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
  },
  2.5: {
    name: "Diamante",
    icon: Sparkles,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  3.0: {
    name: "Mestre",
    icon: Crown,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  3.5: {
    name: "Lendário",
    icon: Zap,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
  },
};

const SIZE_CONFIG = {
  sm: { icon: 16, padding: "px-2 py-1", text: "text-xs" },
  md: { icon: 20, padding: "px-3 py-1.5", text: "text-sm" },
  lg: { icon: 24, padding: "px-4 py-2", text: "text-base" },
};

export function TierBadge({
  tier,
  size = "md",
  showLabel = true,
  animate = true,
}: TierBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG[0];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  const badge = (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full ${config.bgColor} ${sizeConfig.padding} ${sizeConfig.text} font-semibold ${config.color}`}
    >
      <Icon size={sizeConfig.icon} />
      {showLabel && <span>{config.name}</span>}
      <span className="ml-1 opacity-75">{tier}x</span>
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
      >
        {badge}
      </motion.div>
    );
  }

  return badge;
}

