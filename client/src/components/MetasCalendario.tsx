import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Calendar, RefreshCw, Save, SlidersHorizontal } from "lucide-react";
import { obterUltimoDiaDoMes } from "@shared/dateUtils";

interface MetaDiaria {
  dia: number;
  meta: number;
  percentualMeta: number;
  tipo: "automatica" | "manual";
  diaUtil: boolean;
  bloqueado: boolean;
}

interface DistribuicaoResumo {
  metaMensal: number;
  percentualDistribuido: number;
  valorDistribuido: number;
  percentualRestante: number;
  valorRestante: number;
  excedentePercentual: number;
  diasUteis: number;
}

interface MetasCalendarioProps {
  mes: string;
  vendedoraNome: string;
  metasDiarias: MetaDiaria[];
  metaMensal: number;
  distribuicao?: DistribuicaoResumo;
  onAtualizarMeta: (
    dia: number,
    payload: {
      modo: "valor" | "percentual";
      metaValor?: number;
      percentualMeta?: number;
    }
  ) => void;
  onToggleDiaUtil: (dia: number, diaUtil: boolean) => void;
  onRegenerar: () => void;
  isSaving?: boolean;
  isTogglingDiaUtil?: boolean;
}

type DraftDia = {
  percentual: string;
  valor: string;
  modo: "valor" | "percentual";
};

function formatNumberInput(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "";
  return Number(value.toFixed(digits)).toString();
}

function parseInput(value: string) {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function MetasCalendario({
  mes,
  vendedoraNome,
  metasDiarias,
  metaMensal,
  distribuicao,
  onAtualizarMeta,
  onToggleDiaUtil,
  onRegenerar,
  isSaving,
  isTogglingDiaUtil,
}: MetasCalendarioProps) {
  const [drafts, setDrafts] = useState<Record<number, DraftDia>>({});

  const metasPorDia = useMemo(
    () => new Map(metasDiarias.map(meta => [meta.dia, meta])),
    [metasDiarias]
  );

  useEffect(() => {
    setDrafts(
      metasDiarias.reduce<Record<number, DraftDia>>((acc, meta) => {
        acc[meta.dia] = {
          percentual: formatNumberInput(meta.percentualMeta, 4),
          valor: formatNumberInput(meta.meta, 2),
          modo: "percentual",
        };
        return acc;
      }, {})
    );
  }, [metasDiarias]);

  const [ano, mesNum] = mes.split("-").map(Number);
  const ultimoDia = obterUltimoDiaDoMes(mes);
  const primeiroDiaSemana = new Date(ano, mesNum - 1, 1).getDay();
  const dias = Array.from({ length: ultimoDia }, (_, i) => i + 1);
  const resumo = distribuicao ?? {
    metaMensal,
    percentualDistribuido: 0,
    valorDistribuido: 0,
    percentualRestante: 100,
    valorRestante: metaMensal,
    excedentePercentual: 0,
    diasUteis: metasDiarias.filter(meta => meta.diaUtil).length,
  };
  const progress = Math.min(100, Math.max(0, resumo.percentualDistribuido));

  const updateDraftPercentual = (dia: number, percentual: string) => {
    const pct = parseInput(percentual);
    const valor = metaMensal > 0 ? (metaMensal * pct) / 100 : 0;
    setDrafts(prev => ({
      ...prev,
      [dia]: {
        percentual,
        valor: formatNumberInput(valor, 2),
        modo: "percentual",
      },
    }));
  };

  const updateDraftValor = (dia: number, valorInput: string) => {
    const valor = parseInput(valorInput);
    const percentual = metaMensal > 0 ? (valor / metaMensal) * 100 : 0;
    setDrafts(prev => ({
      ...prev,
      [dia]: {
        percentual: formatNumberInput(percentual, 4),
        valor: valorInput,
        modo: "valor",
      },
    }));
  };

  const handleSalvar = (dia: number) => {
    const draft = drafts[dia];
    if (!draft) return;

    if (draft.modo === "percentual") {
      onAtualizarMeta(dia, {
        modo: "percentual",
        percentualMeta: parseInput(draft.percentual),
      });
      return;
    }

    onAtualizarMeta(dia, {
      modo: "valor",
      metaValor: parseInput(draft.valor),
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/60 bg-background/55 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="metric-label mb-2">Planejamento diário</div>
            <h3 className="text-lg font-semibold text-foreground">
              {vendedoraNome}
            </h3>
            <p className="text-sm text-muted-foreground">
              Meta mensal: {formatCurrency(metaMensal)} • {resumo.diasUteis}{" "}
              dias úteis configurados
            </p>
          </div>
          <Button
            onClick={onRegenerar}
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl border-border/70 bg-background/60 hover:bg-background/90"
          >
            <RefreshCw size={14} />
            Redistribuir 100%
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="panel-inset rounded-2xl p-4">
            <div className="metric-label">Distribuído</div>
            <div className="mt-1 text-xl font-semibold">
              {resumo.percentualDistribuido.toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(resumo.valorDistribuido)}
            </div>
          </div>
          <div className="panel-inset rounded-2xl p-4">
            <div className="metric-label">Saldo</div>
            <div className="mt-1 text-xl font-semibold">
              {resumo.percentualRestante.toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(resumo.valorRestante)}
            </div>
          </div>
          <div className="panel-inset rounded-2xl p-4">
            <div className="metric-label">Meta mensal</div>
            <div className="mt-1 text-xl font-semibold">
              {formatCurrency(metaMensal)}
            </div>
            <div className="text-xs text-muted-foreground">
              Base da distribuição
            </div>
          </div>
          <div className="panel-inset rounded-2xl p-4">
            <div className="metric-label">Status</div>
            <div
              className={`mt-1 text-xl font-semibold ${
                resumo.excedentePercentual > 0
                  ? "text-red-300"
                  : resumo.percentualRestante === 0
                    ? "text-emerald-300"
                    : "text-amber-200"
              }`}
            >
              {resumo.excedentePercentual > 0
                ? "Excedido"
                : resumo.percentualRestante === 0
                  ? "Completo"
                  : "Aberto"}
            </div>
            <div className="text-xs text-muted-foreground">
              Limite máximo: 100%
            </div>
          </div>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all ${
              resumo.excedentePercentual > 0
                ? "bg-red-400"
                : resumo.percentualRestante === 0
                  ? "bg-emerald-400"
                  : "bg-primary"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card className="table-shell">
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar size={20} />
            Distribuição diária - {mes}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map(dia => (
              <div
                key={dia}
                className="py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              >
                {dia}
              </div>
            ))}

            {Array.from({ length: primeiroDiaSemana }).map((_, index) => (
              <div key={`empty-${index}`} />
            ))}

            {dias.map(dia => {
              const meta = metasPorDia.get(dia);
              const draft = drafts[dia] ?? {
                percentual: "0",
                valor: "0",
                modo: "percentual" as const,
              };
              const percentualDraft = parseInput(draft.percentual);
              const percentualAtual = meta?.percentualMeta ?? 0;
              const limiteDoDia =
                percentualAtual + resumo.percentualRestante + 0.0001;
              const excedeLimite = percentualDraft > limiteDoDia;
              const bloqueado = !meta?.diaUtil || meta?.bloqueado;

              return (
                <div
                  key={dia}
                  className={`min-h-[178px] rounded-2xl border p-2 transition ${
                    bloqueado
                      ? "border-border/50 bg-background/35 opacity-75"
                      : meta?.tipo === "manual"
                        ? "border-primary/35 bg-primary/10"
                        : "border-border/60 bg-background/70"
                  } ${excedeLimite ? "ring-1 ring-red-400/70" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {dia}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {meta?.tipo === "manual" ? "Manual" : "Auto"}
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(meta?.diaUtil)}
                      onCheckedChange={checked => onToggleDiaUtil(dia, checked)}
                      disabled={isTogglingDiaUtil}
                      aria-label={`Dia ${dia} útil`}
                    />
                  </div>

                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        <SlidersHorizontal size={11} />
                        Percentual
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={draft.percentual}
                        onChange={event =>
                          updateDraftPercentual(dia, event.target.value)
                        }
                        disabled={bloqueado}
                        className="h-8 rounded-lg border-border/70 bg-background/80 px-2 text-xs"
                      />
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        Valor R$
                      </div>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={draft.valor}
                        onChange={event =>
                          updateDraftValor(dia, event.target.value)
                        }
                        disabled={bloqueado}
                        className="h-8 rounded-lg border-border/70 bg-background/80 px-2 text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleSalvar(dia)}
                    disabled={bloqueado || excedeLimite || isSaving}
                    className="mt-3 h-8 w-full rounded-lg text-xs"
                    variant={excedeLimite ? "destructive" : "default"}
                  >
                    <Save size={12} className="mr-1" />
                    Salvar
                  </Button>

                  <div
                    className={`mt-2 min-h-7 text-[10px] leading-4 ${
                      excedeLimite ? "text-red-300" : "text-muted-foreground"
                    }`}
                  >
                    {bloqueado
                      ? "Não útil: distribuição zerada."
                      : excedeLimite
                        ? `Excede em ${(percentualDraft - limiteDoDia).toFixed(
                            2
                          )} p.p.`
                        : `${formatCurrency(parseInput(draft.valor))} da meta.`}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-border/60 bg-background/70" />
              <span>Automática</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-primary/35 bg-primary/10" />
              <span>Manual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-border/50 bg-background/35" />
              <span>Não útil</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
