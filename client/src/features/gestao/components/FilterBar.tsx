import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelectDropdown } from "./MultiSelectDropdown";

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
  comparisonMode: boolean;
  onComparisonModeChange: (value: boolean) => void;
  comparisonDateFrom: string;
  comparisonDateTo: string;
  onComparisonDateFromChange: (value: string) => void;
  onComparisonDateToChange: (value: string) => void;
  onComparisonPreset: (
    mode: "prev_month" | "prev_week" | "prev_year" | "custom"
  ) => void;
  sellerOptions?: string[];
  productOptions?: string[];
  selectedSellers?: string[];
  selectedProducts?: string[];
  onToggleSeller?: (value: string) => void;
  onToggleProduct?: (value: string) => void;
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
  comparisonMode,
  onComparisonModeChange,
  comparisonDateFrom,
  comparisonDateTo,
  onComparisonDateFromChange,
  onComparisonDateToChange,
  onComparisonPreset,
  sellerOptions = [],
  productOptions = [],
  selectedSellers = [],
  selectedProducts = [],
  onToggleSeller,
  onToggleProduct,
}: FilterBarProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestão</h1>
          <p className="text-sm text-slate-300">
            KPIs e drilldown com base nos dados normalizados.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">
              Contratos sem comissão
            </label>
            <Button
              variant={incluirSemComissao ? "secondary" : "outline"}
              onClick={onToggleSemComissao}
              size="sm"
              className="min-w-[160px]"
            >
              {incluirSemComissao
                ? "Incluindo no gráfico"
                : "Excluindo do gráfico"}
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Data início</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => onDateFromChange(e.target.value)}
              className="bg-slate-950 border-slate-800"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Data fim</label>
            <Input
              type="date"
              value={dateTo}
              onChange={e => onDateToChange(e.target.value)}
              className="bg-slate-950 border-slate-800"
            />
          </div>
          {onToggleSeller && sellerOptions.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Vendedoras</label>
              <MultiSelectDropdown
                label="Vendedoras"
                options={sellerOptions}
                selected={selectedSellers}
                onToggle={onToggleSeller}
              />
            </div>
          )}
          {onToggleProduct && productOptions.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Produtos</label>
              <MultiSelectDropdown
                label="Produtos"
                options={productOptions}
                selected={selectedProducts}
                onToggle={onToggleProduct}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Button
          type="button"
          variant={comparisonMode ? "secondary" : "outline"}
          onClick={() => onComparisonModeChange(!comparisonMode)}
        >
          {comparisonMode ? "Comparação ativa" : "Comparar período"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? "Atualizando..." : "Atualizar dados"}
        </Button>
        <Button
          type="button"
          onClick={onApply}
          disabled={isApplying || isRefreshing}
        >
          {isApplying ? "Aplicando..." : "Aplicar filtros"}
        </Button>
        <Button variant="outline" onClick={onExport} disabled={isExporting}>
          {isExporting ? "Exportando..." : "Exportar CSV"}
        </Button>
        <Button variant="ghost" onClick={onClear} className="text-slate-300">
          Limpar filtros
        </Button>
      </div>

      {comparisonMode && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onComparisonPreset("prev_month")}
            >
              Mês anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onComparisonPreset("prev_week")}
            >
              Semana anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onComparisonPreset("prev_year")}
            >
              Mesmo período ano passado
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onComparisonPreset("custom")}
            >
              Personalizado
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Comparar de</label>
              <Input
                type="date"
                value={comparisonDateFrom}
                onChange={e => onComparisonDateFromChange(e.target.value)}
                className="bg-slate-950 border-slate-800"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Comparar até</label>
              <Input
                type="date"
                value={comparisonDateTo}
                onChange={e => onComparisonDateToChange(e.target.value)}
                className="bg-slate-950 border-slate-800"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
