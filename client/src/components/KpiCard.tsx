import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedProgressBar } from "@/components/AnimatedProgressBar";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: "up" | "down" | "neutral";
  progress?: {
    value: number;
    max?: number;
    colorClass?: string;
  };
  valueClassName?: string;
  motionDelay?: number;
  children?: React.ReactNode;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  trend,
  progress,
  valueClassName,
  motionDelay = 0,
  children,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: motionDelay }}
      className="h-full"
    >
      <div className="panel-card-strong flex h-full flex-col gap-3 p-5">
        <div className="flex items-start justify-between">
          <p className="metric-label">{title}</p>
          {Icon && (
            <span className="rounded-full border border-white/10 bg-background/60 p-2">
              <Icon className={cn("h-4 w-4", iconColor ?? "text-primary/70")} />
            </span>
          )}
        </div>

        <div
          className={cn(
            "text-[2rem] font-black tracking-tight tabular-nums",
            valueClassName
          )}
        >
          {value}
        </div>

        {(subtitle || trend) && (
          <div className="flex items-center gap-1.5">
            {trend === "up" && (
              <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            )}
            {trend === "down" && (
              <TrendingDown className="h-3.5 w-3.5 shrink-0 text-rose-400" />
            )}
            {subtitle && (
              <p className={cn(
                "text-xs leading-5",
                trend === "up" ? "text-emerald-400" : trend === "down" ? "text-rose-400" : "text-muted-foreground"
              )}>
                {subtitle}
              </p>
            )}
          </div>
        )}

        {progress && (
          <AnimatedProgressBar
            value={progress.value}
            max={progress.max}
            colorClass={progress.colorClass}
            className="mt-auto"
            delay={motionDelay}
          />
        )}
        {children}
      </div>
    </motion.div>
  );
}
