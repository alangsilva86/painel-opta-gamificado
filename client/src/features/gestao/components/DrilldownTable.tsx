import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  comissaoVendedora?: number;
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
    <Card className="table-shell">
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle>Drilldown</CardTitle>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge
              variant={flagFilters.comissaoCalculada ? "secondary" : "outline"}
              className="cursor-pointer rounded-full"
              onClick={() => toggleFlag("comissaoCalculada")}
            >
              Comissão calculada ({flagCounts.calc})
            </Badge>
            <Badge
              variant={flagFilters.liquidoFallback ? "secondary" : "outline"}
              className="cursor-pointer rounded-full"
              onClick={() => toggleFlag("liquidoFallback")}
            >
              Líquido fallback ({flagCounts.liq})
            </Badge>
            <Badge
              variant={flagFilters.inconsistenciaData ? "secondary" : "outline"}
              className="cursor-pointer rounded-full"
              onClick={() => toggleFlag("inconsistenciaData")}
            >
              Inconsistência de data ({flagCounts.dataInc})
            </Badge>
            <Badge
              variant={flagFilters.semComissao ? "secondary" : "outline"}
              className="cursor-pointer rounded-full"
              onClick={() => toggleFlag("semComissao")}
            >
              Sem comissão (fila)
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="overflow-y-auto max-h-[520px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => onSort("data")}
                >
                  Data {sortLabel("data")}
                </TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Dias desde pag.</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => onSort("liquido")}
                >
                  Líquido {sortLabel("liquido")}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => onSort("comissao")}
                >
                  Comissão Opta {sortLabel("comissao")}
                </TableHead>
                <TableHead>Base Vendedora</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => onSort("takeRate")}
                >
                  Comissão Média {sortLabel("takeRate")}
                </TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEmpty && (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Sem dados neste período. Ajuste as datas ou filtros.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row, idx) => (
                <TableRow
                  key={row.idContrato}
                  className={
                    idx % 2 === 0 ? "bg-background/30" : "bg-background/55"
                  }
                >
                  <TableCell className="font-mono text-xs">
                    {row.numeroContrato || row.idContrato}
                  </TableCell>
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
                  <TableCell>
                    {formatCurrency(row.comissaoVendedora ?? 0)}
                  </TableCell>
                  <TableCell className="flex items-center gap-1">
                    <span>{formatPercent(row.takeRate)}</span>
                    {takeRateBaseline !== undefined && (
                      <span className="text-[11px] text-muted-foreground">
                        {row.takeRate >= takeRateBaseline ? "↑" : "↓"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="space-x-1 text-xs text-muted-foreground">
                    {row.flags.inconsistenciaDataPagamento && (
                      <Badge variant="outline" className="mr-1 rounded-full">
                        data
                      </Badge>
                    )}
                    {row.flags.liquidoFallback && (
                      <Badge variant="outline" className="mr-1 rounded-full">
                        liq
                      </Badge>
                    )}
                    {row.flags.comissaoCalculada && (
                      <Badge variant="outline" className="mr-1 rounded-full">
                        calc
                      </Badge>
                    )}
                    {row.flags.semComissao && (
                      <Badge variant="outline" className="rounded-full">
                        sem comissão
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevPage}
            disabled={page === 1}
          >
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
