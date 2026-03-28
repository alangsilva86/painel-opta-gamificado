import { TIERS, type TierDefinition, type TierName } from "@shared/tiers";

export type TierVisual = {
  accentColor: string;
  textClass: string;
  softBgClass: string;
  cardClass: string;
  glowShadow: string;
};

const TIER_MAP = new Map<TierName, TierDefinition>();
TIERS.forEach(tier => {
  TIER_MAP.set(tier.nome, tier);
});

export const TIER_VISUALS: Record<TierName, TierVisual> = {
  Bronze: {
    accentColor: "#71717a",
    textClass: "text-zinc-300",
    softBgClass: "bg-zinc-500/10",
    cardClass: "border-zinc-600/70 shadow-[0_0_12px_rgba(113,113,122,0.12)]",
    glowShadow: "0 0 24px rgba(113,113,122,0.25)",
  },
  Prata: {
    accentColor: "#d1d5db",
    textClass: "text-slate-100",
    softBgClass: "bg-slate-200/10",
    cardClass: "border-gray-300/50 shadow-[0_0_12px_rgba(209,213,219,0.15)]",
    glowShadow: "0 0 24px rgba(209,213,219,0.28)",
  },
  Ouro: {
    accentColor: "#facc15",
    textClass: "text-yellow-300",
    softBgClass: "bg-yellow-500/10",
    cardClass: "border-yellow-400/60 shadow-[0_0_16px_rgba(250,204,21,0.20)]",
    glowShadow: "0 0 26px rgba(250,204,21,0.34)",
  },
  Platina: {
    accentColor: "#60a5fa",
    textClass: "text-blue-300",
    softBgClass: "bg-blue-500/10",
    cardClass: "border-blue-400/60 shadow-[0_0_18px_rgba(96,165,250,0.24)]",
    glowShadow: "0 0 28px rgba(96,165,250,0.34)",
  },
  Brilhante: {
    accentColor: "#22d3ee",
    textClass: "text-cyan-300",
    softBgClass: "bg-cyan-500/10",
    cardClass: "border-cyan-400/60 shadow-[0_0_18px_rgba(34,211,238,0.26)]",
    glowShadow: "0 0 28px rgba(34,211,238,0.34)",
  },
  Diamante: {
    accentColor: "#2dd4bf",
    textClass: "text-teal-300",
    softBgClass: "bg-teal-500/10",
    cardClass: "border-teal-400/60 shadow-[0_0_18px_rgba(45,212,191,0.26)]",
    glowShadow: "0 0 28px rgba(45,212,191,0.34)",
  },
  Mestre: {
    accentColor: "#fb923c",
    textClass: "text-orange-300",
    softBgClass: "bg-orange-500/10",
    cardClass: "border-orange-400/60 shadow-[0_0_18px_rgba(251,146,60,0.26)]",
    glowShadow: "0 0 28px rgba(251,146,60,0.36)",
  },
  Lendário: {
    accentColor: "#c084fc",
    textClass: "text-purple-300",
    softBgClass: "bg-purple-500/10",
    cardClass: "border-purple-400/70 shadow-[0_0_28px_rgba(192,132,252,0.40)]",
    glowShadow: "0 0 32px rgba(192,132,252,0.42)",
  },
};

export function getTierDefinition(tier: string) {
  return TIER_MAP.get(tier as TierName) || TIER_MAP.get("Bronze")!;
}

export function getTierVisual(tier: string) {
  return TIER_VISUALS[getTierDefinition(tier).nome];
}

export function getTierByThreshold(percentual: number) {
  return TIERS.find(tier => tier.min === percentual) || TIERS[TIERS.length - 1];
}
