import { Badge } from "@/components/ui/badge";
import { FilterState } from "../useGestaoFilters";

type ActiveFiltersProps = {
  filterState: FilterState;
  onRemove: (partial: Partial<FilterState>) => void;
};

export function ActiveFilters({ filterState, onRemove }: ActiveFiltersProps) {
  const hasFilters = Object.values(filterState).some((arr) => arr.length > 0);
  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap gap-2 text-sm text-slate-200">
      {filterState.etapaPipeline.map((v) => (
        <Badge
          key={`etapa-${v}`}
          variant="outline"
          className="border-slate-700 cursor-pointer"
          onClick={() => onRemove({ etapaPipeline: filterState.etapaPipeline.filter((i) => i !== v) })}
        >
          Etapa: {v} ✕
        </Badge>
      ))}
      {filterState.vendedorNome.map((v) => (
        <Badge
          key={`vendedor-${v}`}
          variant="outline"
          className="border-slate-700 cursor-pointer"
          onClick={() => onRemove({ vendedorNome: filterState.vendedorNome.filter((i) => i !== v) })}
        >
          Vendedor: {v} ✕
        </Badge>
      ))}
      {filterState.produto.map((v) => (
        <Badge
          key={`produto-${v}`}
          variant="outline"
          className="border-slate-700 cursor-pointer"
          onClick={() => onRemove({ produto: filterState.produto.filter((i) => i !== v) })}
        >
          Produto: {v} ✕
        </Badge>
      ))}
      {filterState.tipoOperacao.map((v) => (
        <Badge
          key={`tipo-${v}`}
          variant="outline"
          className="border-slate-700 cursor-pointer"
          onClick={() => onRemove({ tipoOperacao: filterState.tipoOperacao.filter((i) => i !== v) })}
        >
          Tipo: {v} ✕
        </Badge>
      ))}
    </div>
  );
}
