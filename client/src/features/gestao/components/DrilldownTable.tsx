import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "../utils";
import { FlagFilters, SortBy, SortDir } from "../useGestaoFilters";

type DrilldownRow = {
  idContrato: string;
  numeroContrato?: string | null;
  dataPagamento?: Date | null;
  vendedorNome: string;
  digitadorNome?: string | null;
  produto: string;
  tipoOperacao?: string | null;
  agenteId?: string | null;
  etapaPipeline: string;
  liquido: number;
  comissaoBase: number;
  comissaoBonus: number;
  comissaoTotal: number;
  takeRate: number;
  diasDesdePagamento?: number | null;
  flags: {
    inconsistenciaDataPagamento?: boolean;
    liquidoFallback?: boolean;
    comissaoCalculada?: boolean;
    semComissao?: boolean;
  };
};

type FlagCounts = { calc: number; liq: number; dataInc: number };

type DrilldownTableProps = {
  rows: DrilldownRow[];
  sortBy: SortBy;
  sortDir: SortDir;
  onSort: (col: SortBy) => void;
  flagFilters: FlagFilters;
  toggleFlag: (key: keyof FlagFilters) => void;
  flagCounts: FlagCounts;
  page: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onExport: () => void;
  takeRateBaseline?: number;
  isEmpty: boolean;
  isExporting?: boolean;
};

export function DrilldownTable({
  rows,
  sortBy,
  sortDir,
  onSort,
  flagFilters,
  toggleFlag,
  flagCounts,
  page,
  onPrevPage,
  onNextPage,
  onExport,
  takeRateBaseline,
  isEmpty,
  isExporting,
}: DrilldownTableProps) {
  const sortLabel = (col: SortBy) => {
    if (sortBy !== col) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  };

  return (
    <Card className="bg-slate-950 border-slate-800">
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle>Drilldown</CardTitle>
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            <Badge
              variant={flagFilters.comissaoCalculada ? "secondary" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleFlag("comissaoCalculada")}
            >
              Comissão calculada ({flagCounts.calc})
            </Badge>
            <Badge
              variant={flagFilters.liquidoFallback ? "secondary" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleFlag("liquidoFallback")}
            >
              Líquido fallback ({flagCounts.liq})
            </Badge>
            <Badge
              variant={flagFilters.inconsistenciaData ? "secondary" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleFlag("inconsistenciaData")}
            >
              Inconsistência de data ({flagCounts.dataInc})
            </Badge>
            <Badge
              variant={flagFilters.semComissao ? "secondary" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleFlag("semComissao")}
            >
              Sem comissão (fila)
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="overflow-y-auto max-h-[480px]">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-950 z-10">
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => onSort("data")}>
                  Data {sortLabel("data")}
                </TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Dias desde pag.</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => onSort("liquido")}>
                  Líquido {sortLabel("liquido")}
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => onSort("comissao")}>
                  Comissão {sortLabel("comissao")}
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => onSort("takeRate")}>
                  Comissão Média {sortLabel("takeRate")}
                </TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEmpty && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-300">
                    Sem dados neste período. Ajuste as datas ou filtros.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row, idx) => (
                <TableRow
                  key={row.idContrato}
                  className={idx % 2 === 0 ? "bg-[#0f172a]" : "bg-[#111827]"}
                >
                  <TableCell className="font-mono text-xs">{row.numeroContrato || row.idContrato}</TableCell>
                  <TableCell>
                    {row.dataPagamento
                      ? new Date(row.dataPagamento).toLocaleDateString("pt-BR")
                      : "-"}
                  </TableCell>
                  <TableCell>{row.vendedorNome}</TableCell>
                  <TableCell>{row.produto}</TableCell>
                  <TableCell>{row.etapaPipeline}</TableCell>
                  <TableCell>{row.diasDesdePagamento ?? "-"}</TableCell>
                  <TableCell>{formatCurrency(row.liquido)}</TableCell>
                  <TableCell>{formatCurrency(row.comissaoTotal)}</TableCell>
                  <TableCell className="flex items-center gap-1">
                    <span>{formatPercent(row.takeRate)}</span>
                    {takeRateBaseline !== undefined && (
                      <span className="text-[11px] text-slate-400">
                        {row.takeRate >= takeRateBaseline ? "↑" : "↓"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 space-x-1">
                    {row.flags.inconsistenciaDataPagamento && <span>data*</span>}
                    {row.flags.liquidoFallback && <span>liq_fallback</span>}
                    {row.flags.comissaoCalculada && <span>calc%</span>}
                    {row.flags.semComissao && <span>sem_comissao</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" size="sm" onClick={onPrevPage} disabled={page === 1}>
            Página anterior
          </Button>
          <Button variant="outline" size="sm" onClick={onNextPage}>
            Próxima página
          </Button>
          <Button size="sm" onClick={onExport} disabled={isExporting}>
            {isExporting ? "Exportando..." : "Exportar recorte"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
