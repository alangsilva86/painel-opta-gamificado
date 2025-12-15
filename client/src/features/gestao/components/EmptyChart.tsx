import { Button } from "@/components/ui/button";

type EmptyChartProps = {
  message: string;
  onClearFilters: () => void;
};

export function EmptyChart({ message, onClearFilters }: EmptyChartProps) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-300">
      <div className="text-center space-y-1">
        <div>{message}</div>
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}
