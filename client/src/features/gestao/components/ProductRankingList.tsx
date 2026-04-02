import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "../utils";

type ProductRow = {
  produto: string;
  comissao: number;
  count: number;
  takeRate: number;
};

type OperationRow = {
  tipoOperacao: string;
  comissao: number;
  count: number;
  takeRate: number;
};

type ProductRankingListProps = {
  title: string;
  rows: ProductRow[];
  operationsByProduct: Map<string, OperationRow[]>;
  activeProducts: string[];
  activeOperations: string[];
  onProductClick: (produto: string) => void;
  onOperationClick: (produto: string, tipoOperacao: string) => void;
};

const rowClass = (active: boolean) =>
  cn(
    "interactive-row flex items-center justify-between px-3 py-2",
    active ? "border-emerald-500/40 bg-emerald-500/10" : ""
  );

export function ProductRankingList({
  title,
  rows,
  operationsByProduct,
  activeProducts,
  activeOperations,
  onProductClick,
  onOperationClick,
}: ProductRankingListProps) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  return (
    <Card className="panel-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(row => {
          const operations = operationsByProduct.get(row.produto) ?? [];
          const isActive = activeProducts.includes(row.produto);
          const isOpen = openMap[row.produto] ?? false;

          return (
            <Collapsible
              key={row.produto}
              open={isOpen}
              onOpenChange={open =>
                setOpenMap(prev => ({ ...prev, [row.produto]: open }))
              }
            >
              <div className={rowClass(isActive)}>
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => onProductClick(row.produto)}
                >
                  <div className="text-sm font-medium">{row.produto}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.count} | {formatPercent(row.takeRate)}
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold">
                    {formatCurrency(row.comissao)}
                  </div>
                  {operations.length > 0 && (
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
                        aria-label="Mostrar tipos de operação"
                      >
                        <ChevronDown
                          size={16}
                          className={cn(
                            "transition-transform",
                            isOpen && "rotate-180"
                          )}
                        />
                      </button>
                    </CollapsibleTrigger>
                  )}
                </div>
              </div>

              {operations.length > 0 && (
                <CollapsibleContent className="space-y-1 pb-2 pl-4 pr-2">
                  {operations.map(op => {
                    const opActive = activeOperations.includes(op.tipoOperacao);
                    return (
                      <button
                        key={`${row.produto}-${op.tipoOperacao}`}
                        type="button"
                        className={cn(rowClass(opActive), "w-full")}
                        onClick={() =>
                          onOperationClick(row.produto, op.tipoOperacao)
                        }
                      >
                        <div>
                          <div className="text-sm">{op.tipoOperacao}</div>
                          <div className="text-xs text-muted-foreground">
                            {op.count} | {formatPercent(op.takeRate)}
                          </div>
                        </div>
                        <div className="text-sm font-semibold">
                          {formatCurrency(op.comissao)}
                        </div>
                      </button>
                    );
                  })}
                </CollapsibleContent>
              )}
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
