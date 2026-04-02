import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TierBadge from "./TierBadge";
import { cn, formatCurrency } from "@/lib/utils";
import { getTierVisual } from "@/lib/tierVisuals";
import {
  Trophy,
  FileText,
  CheckCircle2,
  XCircle,
  DollarSign,
  TrendingUp,
  BarChart3,
  Target,
} from "lucide-react";

interface Contrato {
  id: string;
  numero: string;
  dataPagamento: string;
  valorLiquido: number;
  baseComissionavel: number;
  produto: string;
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
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getRankColor(rank: number | undefined): string {
  if (!rank) return "";
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-gray-300";
  if (rank === 3) return "text-orange-400";
  return "";
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
    (a, b) => new Date(b.dataPagamento).getTime() - new Date(a.dataPagamento).getTime()
  );
  const totalComIncentivo = contratosOrdenados.filter(c => !isSemIncentivo(c)).length;
  const totalSemIncentivo = contratosOrdenados.filter(c => isSemIncentivo(c)).length;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-5xl w-full p-0 overflow-hidden">
        {/* Header */}
        <div className={cn("px-6 pt-6 pb-4 border-b border-white/10", tierVisual.softBgClass)}>
          <DialogHeader>
            <DialogTitle asChild>
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {vendedora.nome.charAt(0).toUpperCase()}
                </div>

                {/* Nome + tier + rank */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-bold truncate">{vendedora.nome}</span>
                    {rank && rank <= 3 && (
                      <span className={cn("flex items-center gap-1 font-bold text-sm", getRankColor(rank))}>
                        <Trophy size={16} />#{rank}
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <TierBadge tier={vendedora.tier} size="sm" />
                  </div>
                </div>

                {/* Visão analítica label */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BarChart3 size={14} />
                  Visão analítica
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* KPI row */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-background/40 border border-white/10 px-3 py-2">
              <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                <TrendingUp size={11} />
                Realizado
              </div>
              <div className={cn("mt-1 text-base font-black", tierVisual.textClass)}>
                {formatCurrency(vendedora.realizado)}
              </div>
            </div>
            <div className="rounded-xl bg-background/40 border border-white/10 px-3 py-2">
              <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                <Target size={11} />
                Meta
              </div>
              <div className="mt-1 text-base font-black text-foreground">
                {formatCurrency(vendedora.meta)}
              </div>
              <div className="text-[11px] text-muted-foreground">{vendedora.percentualMeta.toFixed(1)}% atingido</div>
            </div>
            <div className="rounded-xl bg-background/40 border border-white/10 px-3 py-2">
              <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                <DollarSign size={11} />
                Incentivo previsto
              </div>
              <div className={cn("mt-1 text-base font-black", tierVisual.textClass)}>
                {formatCurrency(vendedora.comissaoPrevista)}
              </div>
            </div>
            <div className="rounded-xl bg-background/40 border border-white/10 px-3 py-2">
              <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                <FileText size={11} />
                Contratos
              </div>
              <div className="mt-1 text-base font-black text-foreground">
                {vendedora.contratos.length}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {totalComIncentivo} c/ incentivo
              </div>
            </div>
          </div>
        </div>

        {/* Mini-KPI badges */}
        <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-white/10 bg-background/60">
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-background/60 px-3 py-1.5">
            <FileText size={13} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="text-xs font-bold text-foreground">{vendedora.contratos.length}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
            <CheckCircle2 size={13} className="text-emerald-400" />
            <span className="text-xs text-emerald-300">Com incentivo</span>
            <span className="text-xs font-bold text-emerald-300">{totalComIncentivo}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-background/60 px-3 py-1.5">
            <XCircle size={13} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Sem incentivo</span>
            <span className="text-xs font-bold text-foreground">{totalSemIncentivo}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-background/60 px-3 py-1.5">
            <DollarSign size={13} className={tierVisual.textClass} />
            <span className="text-xs text-muted-foreground">Base comis.</span>
            <span className={cn("text-xs font-bold", tierVisual.textClass)}>
              {formatCurrency(vendedora.baseComissionavelTotal)}
            </span>
          </div>
        </div>

        {/* Tabela */}
        <div className="px-6 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
            Histórico de contratos — {contratosOrdenados.length} registros
          </div>

          {contratosOrdenados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Nenhum contrato no período</p>
            </div>
          ) : (
            <div className="max-h-[42vh] overflow-y-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                  <tr className="border-b border-white/10">
                    <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold w-8">#</th>
                    <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Data</th>
                    <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Tipo da Operação</th>
                    <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Valor Líquido</th>
                    <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Incentivo na Meta</th>
                    <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contratosOrdenados.map((c, i) => {
                    const semIncentivo = isSemIncentivo(c);
                    return (
                      <tr
                        key={c.id}
                        className={cn(
                          "border-b border-white/5 transition-colors hover:bg-white/5",
                          i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"
                        )}
                      >
                        <td className="px-3 py-2.5 text-muted-foreground text-[11px]">{i + 1}</td>
                        <td className="px-3 py-2.5 text-foreground tabular-nums whitespace-nowrap">
                          {formatDate(c.dataPagamento)}
                        </td>
                        <td className="px-3 py-2.5 text-foreground max-w-[160px] truncate" title={c.produto}>
                          {c.produto || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-foreground">
                          {formatCurrency(c.valorLiquido)}
                        </td>
                        <td className={cn(
                          "px-3 py-2.5 text-right font-semibold tabular-nums",
                          semIncentivo ? "text-muted-foreground" : tierVisual.textClass
                        )}>
                          {semIncentivo ? "—" : formatCurrency(c.baseComissionavel)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {semIncentivo ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-white/10 text-muted-foreground bg-transparent"
                            >
                              Sem incentivo
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-emerald-500/30 text-emerald-300 bg-emerald-500/10"
                            >
                              Com incentivo
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 pb-5">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
