import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

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

export function EscadaAcelerador({ steps, realizado, compact = false }: EscadaAceleradorProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      {steps.map((step, idx) => {
        const isNext = !step.atingido && steps.slice(0, idx).every((s) => s.atingido);
        const variant = step.atingido ? "default" : isNext ? "secondary" : "outline";
        const corClasse = step.atingido
          ? "bg-green-600/80 text-white border-green-500"
          : isNext
            ? "border-yellow-500/60 text-yellow-200"
            : "border-border text-muted-foreground";

        return (
          <Tooltip key={step.label}>
            <TooltipTrigger asChild>
              <Badge
                variant={variant as any}
                className={`gap-2 ${compact ? "h-6 px-2" : ""} ${corClasse}`}
              >
                {step.label}
                {step.atingido ? (
                  <Sparkles size={14} className="text-emerald-200" />
                ) : (
                  <span className="opacity-75">
                    {step.falta > 0 ? `- ${formatCurrency(step.falta)}` : ""}
                  </span>
                )}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">
              {step.atingido ? (
                <div className="space-y-1">
                  <p className="font-semibold">Nível completo</p>
                  <p className="text-xs text-muted-foreground">
                    Realizado: {formatCurrency(realizado)} • Alvo: {formatCurrency(step.alvo)}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-semibold">Próximo nível</p>
                  <p className="text-xs text-muted-foreground">
                    Falta {formatCurrency(step.falta)} para {step.label}
                  </p>
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        );
      })}
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
