import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GestaoResumoData } from "../types";
import { formatCurrency, formatPercent } from "../utils";
import { MetricCard } from "./MetricCard";

type PeriodKpisSectionProps = {
  cards: GestaoResumoData["cards"];
  comparisonMetricDeltas: Partial<Record<string, number | undefined>>;
  comparisonModeApplied: boolean;
  deltas: {
    comissao: number;
    liquido: number;
  };
  metaInput: string;
  onMetaInputChange: (value: string) => void;
  onMetaSave: () => void;
  isSavingMeta: boolean;
};

export function PeriodKpisSection({
  cards,
  comparisonMetricDeltas,
  comparisonModeApplied,
  deltas,
  metaInput,
  onMetaInputChange,
  onMetaSave,
  isSavingMeta,
}: PeriodKpisSectionProps) {
  const comparisonLabel = comparisonModeApplied
    ? "vs período comparado"
    : undefined;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="section-heading text-lg font-semibold text-foreground">
          KPIs do Período
        </h2>
        <p className="text-sm text-muted-foreground">
          Indicadores de meta, ritmo, volume e qualidade do recorte selecionado.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Comissão"
          value={formatCurrency(cards.comissao)}
          hint={`Δ7d: ${formatPercent(deltas.comissao)}`}
          tooltip="Soma da comissão total no período filtrado."
          delta={comparisonMetricDeltas.comissao}
          deltaLabel={comparisonLabel}
          compact
        />
        <MetricCard
          title="Líquido"
          value={formatCurrency(cards.liquido)}
          hint={`Δ7d: ${formatPercent(deltas.liquido)}`}
          tooltip="Soma do líquido liberado no período."
          delta={comparisonMetricDeltas.liquido}
          deltaLabel={comparisonLabel}
          compact
        />
        <MetricCard
          title="Comissão Média %"
          value={formatPercent(cards.takeRate)}
          hint={`Limpa: ${formatPercent(cards.takeRateLimpo ?? 0)}`}
          tooltip="Percentual médio de comissão sobre o líquido."
          delta={comparisonMetricDeltas.takeRate}
          deltaLabel={comparisonLabel}
          compact
        />
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(cards.ticketMedio)}
          tooltip="Líquido médio por contrato."
          delta={comparisonMetricDeltas.ticketMedio}
          deltaLabel={comparisonLabel}
          compact
        />
        <MetricCard
          title="Contratos"
          value={cards.contratos.toLocaleString("pt-BR")}
          tooltip="Quantidade de contratos no período."
          hint={`Sem comissão: ${cards.contratosSemComissao ?? 0}`}
          delta={comparisonMetricDeltas.contratos}
          deltaLabel={comparisonLabel}
          compact
        />
        <MetricCard
          title="% Comissão Calculada"
          value={formatPercent(cards.pctComissaoCalculada)}
          tooltip="Percentual de contratos com comissão calculada via percentual."
          delta={comparisonMetricDeltas.pctComissaoCalculada}
          deltaLabel={comparisonLabel}
          compact
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Meta Comissão"
          tooltip="Meta de comissão para o mês (pode editar)."
          value={
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="decimal"
                value={metaInput}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  onMetaInputChange(event.target.value)
                }
                className="h-10 w-32 border-input bg-background"
              />
              <Button size="sm" onClick={onMetaSave} disabled={isSavingMeta}>
                {isSavingMeta ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          }
        />
        <MetricCard
          title="Pace Comissão (R$/dia)"
          value={formatCurrency(cards.paceComissao ?? 0)}
          tooltip="Comissão média por dia corrido no período."
          delta={comparisonMetricDeltas.paceComissao}
          deltaLabel={comparisonLabel}
        />
        <MetricCard
          title="Necessário/dia p/ meta"
          value={formatCurrency(cards.necessarioPorDia ?? 0)}
          badge={
            (cards.paceComissao ?? 0) >= (cards.necessarioPorDia ?? 0)
              ? "À frente"
              : "Atrás"
          }
          tooltip="Quanto falta por dia para alcançar a meta de comissão."
          delta={comparisonMetricDeltas.necessarioPorDia}
          deltaLabel={comparisonLabel}
        />
        <MetricCard
          title="Dias (decorridos/total)"
          value={`${cards.diasDecorridos ?? 0}/${cards.totalDias ?? 0}`}
          tooltip="Dias corridos dentro do período selecionado."
          compact
        />
      </div>
    </section>
  );
}
