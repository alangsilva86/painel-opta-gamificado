import { type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedProgressBar } from "@/components/AnimatedProgressBar";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
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
    >
      <Card className="panel-card-strong h-full gap-4">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </CardTitle>
          {Icon && (
            <span className="rounded-full border border-white/10 bg-background/60 p-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className={cn(
              "text-[2rem] font-black tracking-tight",
              valueClassName
            )}
          >
            {value}
          </div>
          {subtitle && (
            <p className="text-xs leading-5 text-muted-foreground">
              {subtitle}
            </p>
          )}
          {progress && (
            <AnimatedProgressBar
              value={progress.value}
              max={progress.max}
              colorClass={progress.colorClass}
              className="mt-3"
              delay={motionDelay}
            />
          )}
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}
