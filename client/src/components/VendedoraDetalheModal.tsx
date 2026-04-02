import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TierBadge from "./TierBadge";
import { cn, formatCurrency } from "@/lib/utils";
import { getTierVisual } from "@/lib/tierVisuals";
import {
  BarChart3,
  CheckCircle2,
  DollarSign,
  FileText,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";

interface Contrato {
  id: string;
  numero: string;
  dataPagamento: string;
  valorLiquido: number;
  baseComissionavel: number;
  produto: string;
  tipoOperacao?: string;
  estagio: string;
  ignoradoPainelVendedoras?: boolean;
}

interface VendedoraDetalheModalProps {
  vendedora: {
    id: string;
    nome: string;
    realizado: number;
    meta: number;
    percentualMeta: number;
    tier: string;
    comissaoPrevista: number;
    baseComissionavelTotal: number;
    contratos: Contrato[];
    contratosSemComissao: number;
  } | null;
  rank?: number;
  open: boolean;
  onClose: () => void;
}

function isSemIncentivo(c: Contrato): boolean {
  return c.ignoradoPainelVendedoras === true || c.baseComissionavel === 0;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getRankColor(rank: number | undefined): string {
  if (!rank) return "";
  if (rank === 1) return "text-yellow-300";
  if (rank === 2) return "text-zinc-200";
  if (rank === 3) return "text-orange-300";
  return "text-muted-foreground";
}

export function VendedoraDetalheModal({
  vendedora,
  rank,
  open,
  onClose,
}: VendedoraDetalheModalProps) {
  if (!vendedora) return null;

  const tierVisual = getTierVisual(vendedora.tier);
  const contratosOrdenados = [...vendedora.contratos].sort(
    (a, b) =>
      new Date(b.dataPagamento).getTime() - new Date(a.dataPagamento).getTime()
  );
  const totalComIncentivo = contratosOrdenados.filter(
    c => !isSemIncentivo(c)
  ).length;
  const totalSemIncentivo = contratosOrdenados.filter(c =>
    isSemIncentivo(c)
  ).length;
  const taxaEfetiva =
    vendedora.baseComissionavelTotal > 0
      ? vendedora.comissaoPrevista / vendedora.baseComissionavelTotal
      : 0;

  const incentivoContrato = (c: Contrato) =>
    isSemIncentivo(c) ? 0 : c.baseComissionavel * taxaEfetiva;

  const summaryCards = [
    {
      label: "Realizado",
      value: formatCurrency(vendedora.realizado),
      description: "Volume acumulado no período.",
      icon: TrendingUp,
      tone: tierVisual.textClass,
    },
    {
      label: "Meta",
      value: formatCurrency(vendedora.meta),
      description: `${vendedora.percentualMeta.toFixed(1)}% atingido.`,
      icon: Target,
      tone: "text-foreground",
    },
    {
      label: "Incentivo Previsto",
      value: formatCurrency(vendedora.comissaoPrevista),
      description: "Valor estimado com a produção atual.",
      icon: DollarSign,
      tone: tierVisual.textClass,
    },
    {
      label: "Contratos",
      value: String(vendedora.contratos.length),
      description: `${totalComIncentivo} com incentivo elegível.`,
      icon: FileText,
      tone: "text-foreground",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(94vh,calc(100svh-1rem))] w-[min(100%-1rem,76rem)] max-w-6xl flex-col overflow-hidden rounded-[28px] border border-border/70 bg-background/96 p-0 shadow-2xl backdrop-blur-xl overscroll-contain sm:h-[min(92vh,calc(100svh-2rem))]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{`Análise de ${vendedora.nome}`}</DialogTitle>
          <DialogDescription>
            Resumo de performance, progresso da meta e histórico de contratos da
            vendedora selecionada.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "border-b border-border/70 px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5",
            tierVisual.softBgClass
          )}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="status-chip border-primary/25 bg-primary/10 text-primary">
                  Performance individual
                </div>
                {rank ? (
                  <div
                    className={cn(
                      "status-chip border-border/70 bg-background/60",
                      getRankColor(rank)
                    )}
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    <span>{`#${String(rank).padStart(2, "0")} no ranking`}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-border/70 bg-gradient-to-br from-primary/95 to-sky-400/70 text-2xl font-semibold text-primary-foreground">
                  {vendedora.nome.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="min-w-0 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                      <span className="block truncate">{vendedora.nome}</span>
                    </h2>
                    <div className="status-chip border-border/70 bg-background/60 text-muted-foreground">
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span>Visão analítica</span>
                    </div>
                  </div>
                  <TierBadge tier={vendedora.tier} size="sm" />
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    Resumo consolidado de meta, incentivo e contratos para
                    análise rápida em qualquer breakpoint.
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={onClose}
              className="h-10 rounded-xl border-border/70 bg-background/70 px-4 hover:bg-background"
            >
              Fechar
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map(item => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="panel-inset rounded-2xl border border-border/60 p-4"
                >
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </div>
                  <div
                    className={cn(
                      "mt-3 text-xl font-semibold sm:text-2xl",
                      item.tone
                    )}
                  >
                    {item.value}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-background/75 px-4 py-3 sm:px-6">
          <div className="status-chip border-border/70 bg-background/60 text-foreground">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{vendedora.contratos.length} contratos</span>
          </div>
          <div className="status-chip border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{`${totalComIncentivo} com incentivo`}</span>
          </div>
          <div className="status-chip border-border/70 bg-background/60 text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" />
            <span>{`${totalSemIncentivo} sem incentivo`}</span>
          </div>
          <div className="status-chip border-border/70 bg-background/60 text-foreground">
            <DollarSign className={cn("h-3.5 w-3.5", tierVisual.textClass)} />
            <span>{`Base comiss. ${formatCurrency(vendedora.baseComissionavelTotal)}`}</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          <div className="page-section-header items-start gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Histórico de contratos
              </h3>
              <p className="page-section-copy">
                {contratosOrdenados.length} registros ordenados do mais recente
                para o mais antigo.
              </p>
            </div>
          </div>

          {contratosOrdenados.length === 0 ? (
            <div className="empty-state mt-4 flex min-h-[240px] flex-col items-center justify-center text-center">
              <FileText className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Nenhum contrato disponível neste período.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-2xl border border-border/60 bg-background/35 lg:block">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                    <tr className="border-b border-border/60">
                      <th className="w-10 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Data
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Operação
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Valor Líquido
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Incentivo
                      </th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {contratosOrdenados.map((contrato, index) => {
                      const semIncentivo = isSemIncentivo(contrato);
                      const incentivo = incentivoContrato(contrato);

                      return (
                        <tr
                          key={contrato.id}
                          className={cn(
                            "border-b border-border/40 transition-colors hover:bg-background/70",
                            index % 2 === 0
                              ? "bg-transparent"
                              : "bg-background/35"
                          )}
                        >
                          <td className="px-4 py-3 text-[11px] text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-medium tabular-nums text-foreground">
                            {formatDate(contrato.dataPagamento)}
                          </td>
                          <td
                            className="max-w-[260px] truncate px-4 py-3 text-foreground"
                            title={contrato.tipoOperacao || contrato.produto}
                          >
                            {contrato.tipoOperacao || contrato.produto || "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                            {formatCurrency(contrato.valorLiquido)}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 text-right font-semibold tabular-nums",
                              semIncentivo || incentivo === 0
                                ? "text-muted-foreground"
                                : tierVisual.textClass
                            )}
                          >
                            {semIncentivo || incentivo === 0
                              ? "—"
                              : formatCurrency(incentivo)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant="outline"
                              className={
                                semIncentivo
                                  ? "border-border/60 bg-background/50 text-muted-foreground"
                                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                              }
                            >
                              {semIncentivo ? "Sem incentivo" : "Com incentivo"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 lg:hidden">
                {contratosOrdenados.map((contrato, index) => {
                  const semIncentivo = isSemIncentivo(contrato);
                  const incentivo = incentivoContrato(contrato);

                  return (
                    <div
                      key={contrato.id}
                      className="panel-card rounded-2xl border-border/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="metric-label">{`Contrato ${index + 1}`}</div>
                          <div className="mt-1 text-sm font-semibold text-foreground">
                            {contrato.tipoOperacao || contrato.produto || "—"}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            semIncentivo
                              ? "border-border/60 bg-background/50 text-muted-foreground"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                          }
                        >
                          {semIncentivo ? "Sem incentivo" : "Com incentivo"}
                        </Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="panel-inset rounded-xl p-3">
                          <div className="metric-label">Data</div>
                          <div className="mt-2 text-sm font-medium tabular-nums text-foreground">
                            {formatDate(contrato.dataPagamento)}
                          </div>
                        </div>
                        <div className="panel-inset rounded-xl p-3">
                          <div className="metric-label">Valor líquido</div>
                          <div className="mt-2 text-sm font-semibold tabular-nums text-foreground">
                            {formatCurrency(contrato.valorLiquido)}
                          </div>
                        </div>
                        <div className="panel-inset rounded-xl p-3">
                          <div className="metric-label">Incentivo</div>
                          <div
                            className={cn(
                              "mt-2 text-sm font-semibold tabular-nums",
                              semIncentivo || incentivo === 0
                                ? "text-muted-foreground"
                                : tierVisual.textClass
                            )}
                          >
                            {semIncentivo || incentivo === 0
                              ? "—"
                              : formatCurrency(incentivo)}
                          </div>
                        </div>
                        <div className="panel-inset rounded-xl p-3">
                          <div className="metric-label">Base comiss.</div>
                          <div className="mt-2 text-sm font-medium tabular-nums text-foreground">
                            {formatCurrency(contrato.baseComissionavel)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-border/60 bg-background/85 px-4 py-3 sm:px-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-10 rounded-xl border-border/70 bg-background/60 px-4 hover:bg-background"
          >
            Fechar análise
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
