import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedProgressBarProps {
  value: number;
  max?: number;
  colorClass?: string;
  className?: string;
  height?: "xs" | "sm" | "md";
  delay?: number;
}

const heightMap = {
  xs: "h-[3px]",
  sm: "h-1.5",
  md: "h-2",
};

export function AnimatedProgressBar({
  value,
  max = 100,
  colorClass = "bg-primary",
  className,
  height = "sm",
  delay = 0,
}: AnimatedProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 140) : 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-full bg-secondary",
        heightMap[height],
        className
      )}
    >
      <motion.div
        className={cn("h-full rounded-full", colorClass)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut", delay }}
      />
    </div>
  );
}
