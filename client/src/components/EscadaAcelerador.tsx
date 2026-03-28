import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface EscadaStep {
  label: string;
  percentual: number;
  alvo: number;
  falta: number;
  atingido: boolean;
}

interface EscadaAceleradorProps {
  steps: EscadaStep[];
  realizado: number;
  compact?: boolean;
}

export function EscadaAcelerador({
  steps,
  realizado,
  compact = false,
}: EscadaAceleradorProps) {
  return (
    <div className={compact ? "text-xs" : "text-sm"}>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-center gap-0">
          {steps.map((step, idx) => {
            const isNext =
              !step.atingido && steps.slice(0, idx).every(s => s.atingido);
            const StepTag = isNext ? motion.div : "div";

            return (
              <div key={step.label} className="flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <StepTag
                      {...(isNext
                        ? {
                            animate: {
                              boxShadow: [
                                "0 0 0 rgba(245, 158, 11, 0)",
                                "0 0 22px rgba(245, 158, 11, 0.35)",
                                "0 0 0 rgba(245, 158, 11, 0)",
                              ],
                            },
                            transition: {
                              duration: 1.8,
                              repeat: Infinity,
                              ease: "easeInOut",
                            },
                          }
                        : {})}
                      className={cn(
                        "relative flex min-w-[148px] items-center justify-between gap-3 border px-4 py-3",
                        compact && "min-w-[132px] px-3 py-2",
                        step.atingido &&
                          "border-emerald-400/60 bg-emerald-500/20 text-emerald-100",
                        isNext &&
                          "border-amber-400/70 bg-amber-500/15 text-amber-100",
                        !step.atingido &&
                          !isNext &&
                          "border-border bg-background/70 text-muted-foreground"
                      )}
                      style={{
                        clipPath:
                          steps.length === 1
                            ? "polygon(0 0, 100% 0, 100% 100%, 0 100%)"
                            : idx === 0
                              ? "polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%)"
                              : idx === steps.length - 1
                                ? "polygon(16px 0, 100% 0, 100% 100%, 16px 100%, 0 50%)"
                                : "polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%, 0 50%, 16px 50%)",
                      }}
                    >
                      <div>
                        <div className="font-semibold">{step.label}</div>
                        <div className="text-[11px] opacity-80">
                          {step.atingido
                            ? "Concluído"
                            : step.falta > 0
                              ? `Faltam ${formatCurrency(step.falta)}`
                              : "Em progresso"}
                        </div>
                      </div>
                      {step.atingido ? (
                        <div className="flex size-8 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-200">
                          <Check size={16} />
                        </div>
                      ) : isNext ? (
                        <Sparkles size={18} className="text-amber-300" />
                      ) : (
                        <div className="text-xs font-semibold opacity-70">
                          {step.percentual.toFixed(0)}%
                        </div>
                      )}
                    </StepTag>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {step.atingido ? (
                      <div className="space-y-1">
                        <p className="font-semibold">Nível completo</p>
                        <p className="text-xs text-muted-foreground">
                          Realizado: {formatCurrency(realizado)} • Alvo:{" "}
                          {formatCurrency(step.alvo)}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {isNext ? "Próximo nível" : "Degrau futuro"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Falta {formatCurrency(step.falta)} para {step.label}
                        </p>
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
                {idx < steps.length - 1 && (
                  <div className="h-px w-4 bg-border md:w-6" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}
