import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "../utils";
import { FilterState } from "../useGestaoFilters";

type SellerRow = {
  vendedor: string;
  count: number;
  comissionadosCount?: number;
  semComissaoCount: number;
  liquido: number;
  comissao: number;
  comissaoBase?: number;
  comissaoBonus?: number;
  meta?: number;
  pctMeta?: number;
  liquidoComissionado?: number;
  comissaoComissionado?: number;
  ticketMedio?: number;
  ticketMedioComissionado?: number;
  takeRate: number;
  takeRateLimpo?: number;
  pctComissaoCalculada?: number;
  pctLiquidoFallback?: number;
  pctInconsistenciaData?: number;
  pctTotal?: number;
};

type SellerPerformanceTableProps = {
  rows: SellerRow[];
  incluirSemComissao: boolean;
  filterState: FilterState;
  onSellerClick: (vendedor: string) => void;
};

export function SellerPerformanceTable({
  rows,
  incluirSemComissao,
  filterState,
  onSellerClick,
}: SellerPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<"producao" | "comissao" | "semComissao">("comissao");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const semComissaoThreshold = 0.1;

  const handleSort = (key: "producao" | "comissao" | "semComissao") => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("desc");
  };

  const sortLabel = (key: "producao" | "comissao" | "semComissao") => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? "asc" : "desc";
  };

  const sorted = useMemo(() => {
    const getLiquidoDisplay = (row: SellerRow) =>
      incluirSemComissao ? row.liquido : row.liquidoComissionado ?? row.liquido;
    const getComissaoDisplay = (row: SellerRow) =>
      incluirSemComissao ? row.comissao : row.comissaoComissionado ?? row.comissao;
    const getSemComissaoPct = (row: SellerRow) =>
      row.count > 0 ? row.semComissaoCount / row.count : 0;

    return rows
      .slice()
      .sort((a, b) => {
        const aVal =
          sortKey === "producao"
            ? getLiquidoDisplay(a)
            : sortKey === "comissao"
              ? getComissaoDisplay(a)
              : getSemComissaoPct(a);
        const bVal =
          sortKey === "producao"
            ? getLiquidoDisplay(b)
            : sortKey === "comissao"
              ? getComissaoDisplay(b)
              : getSemComissaoPct(b);
        if (aVal === bVal) return b.comissao - a.comissao;
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
  }, [rows, incluirSemComissao, sortKey, sortDir]);

  return (
    <Card className="bg-slate-950 border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle>Produção & Comissão por Vendedora</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendedora</TableHead>
              <TableHead>Meta</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("producao")}>
                Produção{sortLabel("producao") ? ` (${sortLabel("producao")})` : ""}
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("comissao")}>
                Comissão{sortLabel("comissao") ? ` (${sortLabel("comissao")})` : ""}
              </TableHead>
              <TableHead>Comissão média</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("semComissao")}>
                Sem comissão{sortLabel("semComissao") ? ` (${sortLabel("semComissao")})` : ""}
              </TableHead>
              <TableHead>Qualidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-300">
                  Sem dados de vendedoras no período.
                </TableCell>
              </TableRow>
            )}
            {sorted.map((row, idx) => {
              const ativo = filterState.vendedorNome.includes(row.vendedor);
              const liquidoDisplay = incluirSemComissao
                ? row.liquido
                : row.liquidoComissionado ?? row.liquido;
              const comissaoDisplay = incluirSemComissao
                ? row.comissao
                : row.comissaoComissionado ?? row.comissao;
              const ticketDisplay = incluirSemComissao
                ? row.ticketMedio ?? (row.count > 0 ? row.liquido / row.count : 0)
                : row.ticketMedioComissionado ??
                  ((row.comissionadosCount ?? row.count - row.semComissaoCount) > 0
                    ? (row.liquidoComissionado ?? row.liquido) /
                      Math.max(1, row.comissionadosCount ?? row.count - row.semComissaoCount)
                    : 0);
              const takeRateDisplay = incluirSemComissao
                ? row.takeRate
                : row.takeRateLimpo ?? row.takeRate;
              const takeRateLimpo = row.takeRateLimpo ?? row.takeRate;
              const liquidoSemComissao = Math.max(
                0,
                row.liquido - (row.liquidoComissionado ?? row.liquido)
              );
              const pctSemComissao = row.count > 0 ? row.semComissaoCount / row.count : 0;
              const semComissaoAlert = pctSemComissao >= semComissaoThreshold;

              return (
                <TableRow
                  key={row.vendedor}
                  className={`cursor-pointer ${
                    ativo
                      ? "bg-emerald-900/20"
                      : idx % 2 === 0
                        ? "bg-[#0f172a]"
                        : "bg-[#111827]"
                  } ${semComissaoAlert ? "ring-1 ring-amber-500/40" : ""}`}
                  onClick={() => onSellerClick(row.vendedor)}
                >
                  <TableCell>
                    <div className="font-medium">{row.vendedor}</div>
                    <div className="text-xs text-slate-400">
                      {formatPercent(row.pctTotal ?? 0)} da comissão
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.meta && row.meta > 0 ? (
                      <>
                        <div className="font-semibold">{formatCurrency(row.meta)}</div>
                        <div className="text-xs text-slate-400">
                          {formatPercent(row.pctMeta ?? 0)} da meta
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-500">Sem meta</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{formatCurrency(liquidoDisplay)}</div>
                    <div className="text-xs text-slate-400">
                      Ticket {formatCurrency(ticketDisplay)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{formatCurrency(comissaoDisplay)}</div>
                    <div className="text-xs text-slate-400">
                      Base {formatCurrency(row.comissaoBase ?? 0)} • Bônus{" "}
                      {formatCurrency(row.comissaoBonus ?? 0)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{formatPercent(takeRateDisplay)}</div>
                    <div className="text-xs text-slate-400">
                      Limpa {formatPercent(takeRateLimpo)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">
                      {row.semComissaoCount} / {row.count}
                    </div>
                    <div className={`text-xs ${semComissaoAlert ? "text-amber-300" : "text-slate-400"}`}>
                      {formatPercent(pctSemComissao)} sem comissão
                    </div>
                    {liquidoSemComissao > 0 && (
                      <div className="text-xs text-slate-500">
                        Líquido sem comissão {formatCurrency(liquidoSemComissao)}
                      </div>
                    )}
                    {semComissaoAlert && (
                      <Badge variant="destructive" className="text-[10px] mt-1">
                        alerta &gt; 10%
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-y-1">
                    <div className="text-xs text-slate-400">
                      calc {formatPercent(row.pctComissaoCalculada ?? 0)}
                    </div>
                    <div className="text-xs text-slate-400">
                      liq {formatPercent(row.pctLiquidoFallback ?? 0)}
                    </div>
                    <div className="text-xs text-slate-400">
                      data {formatPercent(row.pctInconsistenciaData ?? 0)}
                    </div>
                    {(row.semComissaoCount ?? 0) > 0 && (
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                        revisar comissão
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
