import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FilterBarProps = {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  incluirSemComissao: boolean;
  onToggleSemComissao: () => void;
  onApply: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  isApplying: boolean;
  onExport: () => void;
  onClear: () => void;
  isExporting: boolean;
};

export function FilterBar({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  incluirSemComissao,
  onToggleSemComissao,
  onApply,
  onRefresh,
  isRefreshing,
  isApplying,
  onExport,
  onClear,
  isExporting,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">Gestão</h1>
        <p className="text-sm text-slate-300">KPIs e drilldown com base nos dados normalizados.</p>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Contratos sem comissão</label>
          <Button
            variant={incluirSemComissao ? "secondary" : "outline"}
            onClick={onToggleSemComissao}
            size="sm"
            className="min-w-[160px]"
          >
            {incluirSemComissao ? "Incluindo no gráfico" : "Excluindo do gráfico"}
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Data início</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="bg-slate-950 border-slate-800"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Data fim</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="bg-slate-950 border-slate-800"
          />
        </div>
        <Button type="button" variant="secondary" onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? "Atualizando..." : "Atualizar dados"}
        </Button>
        <Button type="button" onClick={onApply} disabled={isApplying || isRefreshing}>
          {isApplying ? "Aplicando..." : "Aplicar filtros"}
        </Button>
        <Button variant="outline" onClick={onExport} disabled={isExporting}>
          {isExporting ? "Exportando..." : "Exportar CSV"}
        </Button>
        <Button variant="ghost" onClick={onClear} className="text-slate-300">
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}
