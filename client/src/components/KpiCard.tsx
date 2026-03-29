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
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
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
