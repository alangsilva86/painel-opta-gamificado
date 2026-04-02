import { Badge } from "@/components/ui/badge";
import { FilterState } from "../useGestaoFilters";

type ActiveFiltersProps = {
  filterState: FilterState;
  onRemove: (partial: Partial<FilterState>) => void;
};

export function ActiveFilters({ filterState, onRemove }: ActiveFiltersProps) {
  const hasFilters = Object.values(filterState).some(arr => arr.length > 0);
  if (!hasFilters) return null;

  return (
    <div className="panel-card flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
      <span className="metric-label">Filtros ativos</span>
      {filterState.etapaPipeline.map(v => (
        <Badge
          key={`etapa-${v}`}
          variant="outline"
          className="status-chip cursor-pointer border-primary/20 bg-primary/10 hover:bg-primary/15"
          onClick={() =>
            onRemove({
              etapaPipeline: filterState.etapaPipeline.filter(i => i !== v),
            })
          }
        >
          Etapa: {v}
          <span aria-hidden="true">×</span>
        </Badge>
      ))}
      {filterState.vendedorNome.map(v => (
        <Badge
          key={`vendedor-${v}`}
          variant="outline"
          className="status-chip cursor-pointer border-primary/20 bg-primary/10 hover:bg-primary/15"
          onClick={() =>
            onRemove({
              vendedorNome: filterState.vendedorNome.filter(i => i !== v),
            })
          }
        >
          Vendedor: {v}
          <span aria-hidden="true">×</span>
        </Badge>
      ))}
      {filterState.produto.map(v => (
        <Badge
          key={`produto-${v}`}
          variant="outline"
          className="status-chip cursor-pointer border-primary/20 bg-primary/10 hover:bg-primary/15"
          onClick={() =>
            onRemove({
              produto: filterState.produto.filter(i => i !== v),
            })
          }
        >
          Produto: {v}
          <span aria-hidden="true">×</span>
        </Badge>
      ))}
      {filterState.tipoOperacao.map(v => (
        <Badge
          key={`tipo-${v}`}
          variant="outline"
          className="status-chip cursor-pointer border-primary/20 bg-primary/10 hover:bg-primary/15"
          onClick={() =>
            onRemove({
              tipoOperacao: filterState.tipoOperacao.filter(i => i !== v),
            })
          }
        >
          Tipo: {v}
          <span aria-hidden="true">×</span>
        </Badge>
      ))}
    </div>
  );
}
