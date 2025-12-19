import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
    <Card className="bg-slate-950 border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-400">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => {
          const operations = operationsByProduct.get(row.produto) || [];
          const isActive = activeProducts.includes(row.produto);
          const isOpen = openMap[row.produto] ?? false;

          return (
            <Collapsible
              key={row.produto}
              open={isOpen}
              onOpenChange={(open) => setOpenMap((prev) => ({ ...prev, [row.produto]: open }))}
            >
              <div
                className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                  isActive
                    ? "border-emerald-500 bg-emerald-900/20"
                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                }`}
              >
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => onProductClick(row.produto)}
                >
                  <div className="text-sm font-medium">{row.produto}</div>
                  <div className="text-xs text-slate-400">
                    {row.count} | {formatPercent(row.takeRate)}
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold">{formatCurrency(row.comissao)}</div>
                  {operations.length > 0 && (
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="rounded-md p-1 text-slate-400 hover:text-slate-200"
                        aria-label="Mostrar tipos de operação"
                      >
                        <ChevronDown size={16} className={isOpen ? "rotate-180" : ""} />
                      </button>
                    </CollapsibleTrigger>
                  )}
                </div>
              </div>

              {operations.length > 0 && (
                <CollapsibleContent className="space-y-1 pl-4 pr-2 pb-2">
                  {operations.map((op) => {
                    const opActive = activeOperations.includes(op.tipoOperacao);
                    return (
                      <button
                        key={`${row.produto}-${op.tipoOperacao}`}
                        type="button"
                        className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left ${
                          opActive
                            ? "border-emerald-500 bg-emerald-900/20"
                            : "border-slate-800 bg-slate-900 hover:border-slate-700"
                        }`}
                        onClick={() => onOperationClick(row.produto, op.tipoOperacao)}
                      >
                        <div>
                          <div className="text-sm">{op.tipoOperacao}</div>
                          <div className="text-xs text-slate-400">
                            {op.count} | {formatPercent(op.takeRate)}
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{formatCurrency(op.comissao)}</div>
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
