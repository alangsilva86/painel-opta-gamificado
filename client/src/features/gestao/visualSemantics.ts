import type {
  GestaoBusinessStatus,
  GestaoDataQualityInfo,
  GestaoExecutiveMetric,
  GestaoExecutiveNarrativeItem,
  GestaoFreshnessInfo,
  GestaoWatchlistItem,
} from "./types";

type ToneKey = "good" | "warning" | "critical" | "neutral" | "info";

const toneMap: Record<
  ToneKey,
  {
    panelClass: string;
    badgeClass: string;
    emphasisTextClass: string;
    mutedTextClass: string;
  }
> = {
  good: {
    panelClass: "border-emerald-500/20 bg-emerald-500/[0.08]",
    badgeClass: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
    emphasisTextClass: "text-emerald-100",
    mutedTextClass: "text-emerald-100/80",
  },
  warning: {
    panelClass: "border-amber-500/20 bg-amber-500/[0.08]",
    badgeClass: "border-amber-400/35 bg-amber-500/10 text-amber-100",
    emphasisTextClass: "text-amber-100",
    mutedTextClass: "text-amber-100/80",
  },
  critical: {
    panelClass: "border-rose-500/20 bg-rose-500/[0.08]",
    badgeClass: "border-rose-400/35 bg-rose-500/10 text-rose-100",
    emphasisTextClass: "text-rose-100",
    mutedTextClass: "text-rose-100/80",
  },
  neutral: {
    panelClass: "border-border bg-card",
    badgeClass: "border-border bg-secondary text-foreground",
    emphasisTextClass: "text-foreground",
    mutedTextClass: "text-muted-foreground",
  },
  info: {
    panelClass: "border-primary/20 bg-primary/[0.08]",
    badgeClass: "border-primary/30 bg-primary/10 text-primary-foreground",
    emphasisTextClass: "text-foreground",
    mutedTextClass: "text-muted-foreground",
  },
};

function getExecutiveToneKey(
  status: GestaoBusinessStatus["status"] | GestaoDataQualityInfo["status"]
): ToneKey {
  if (status === "good") return "good";
  if (status === "warning") return "warning";
  if (status === "critical") return "critical";
  return "neutral";
}

export function getToneClasses(tone: ToneKey) {
  return toneMap[tone];
}

export function getFreshnessTone(
  status?: GestaoFreshnessInfo["status"]
): ToneKey {
  if (status === "fresh") return "good";
  if (status === "attention") return "warning";
  if (status === "stale") return "critical";
  return "neutral";
}

export function getExecutiveStatusTone(
  status?: GestaoBusinessStatus["status"] | GestaoDataQualityInfo["status"]
) {
  return getToneClasses(status ? getExecutiveToneKey(status) : "neutral");
}

export function getSeverityTone(
  severity:
    | GestaoExecutiveNarrativeItem["severity"]
    | GestaoWatchlistItem["severity"]
) {
  if (severity === "critical") return getToneClasses("critical");
  if (severity === "warning") return getToneClasses("warning");
  return getToneClasses("info");
}

export function getExecutiveHeroClass(status: GestaoBusinessStatus["status"]) {
  if (status === "good") {
    return "border-emerald-500/25 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_rgba(6,10,22,0.98)_58%)]";
  }
  if (status === "warning") {
    return "border-amber-500/25 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.2),_rgba(6,10,22,0.98)_58%)]";
  }
  if (status === "critical") {
    return "border-rose-500/25 bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.2),_rgba(6,10,22,0.98)_58%)]";
  }
  return "border-border bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_rgba(6,10,22,0.98)_58%)]";
}

export function getExecutiveMetricTone(
  status: GestaoExecutiveMetric["status"]
) {
  if (status === "good") {
    return {
      ...getToneClasses("good"),
      cardClass: "border-emerald-500/25 bg-emerald-500/[0.06]",
      lineClass: "stroke-emerald-300",
      areaClass: "fill-emerald-400/10",
      label: "Saudável",
    };
  }
  if (status === "warning") {
    return {
      ...getToneClasses("warning"),
      cardClass: "border-amber-500/25 bg-amber-500/[0.06]",
      lineClass: "stroke-amber-300",
      areaClass: "fill-amber-400/10",
      label: "Atenção",
    };
  }
  if (status === "critical") {
    return {
      ...getToneClasses("critical"),
      cardClass: "border-rose-500/25 bg-rose-500/[0.06]",
      lineClass: "stroke-rose-300",
      areaClass: "fill-rose-400/10",
      label: "Risco",
    };
  }
  return {
    ...getToneClasses("neutral"),
    cardClass: "border-border bg-card",
    lineClass: "stroke-primary/80",
    areaClass: "fill-primary/10",
    label: "Contexto",
  };
}

export function getDeltaToneClass(
  delta: number,
  favorableWhenPositive: boolean
) {
  if (Math.abs(delta) <= 0.01) {
    return "text-muted-foreground";
  }

  const isFavorable = favorableWhenPositive ? delta > 0 : delta < 0;
  return isFavorable ? "text-emerald-300" : "text-rose-300";
}
