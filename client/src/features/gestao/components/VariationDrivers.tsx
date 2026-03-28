import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  GestaoProductRow,
  GestaoResumoData,
  GestaoSellerRow,
} from "../types";
import { formatCurrency, formatPercent } from "../utils";
import { getDeltaToneClass } from "../visualSemantics";

type DriverItem = {
  label: string;
  deltaAbs: number;
  deltaPct?: number;
};

type VariationDriversProps = {
  current: GestaoResumoData;
  comparison?: GestaoResumoData | null;
  onSellerClick: (seller: string) => void;
  onProductClick: (product: string) => void;
  onOperationClick: (operation: string) => void;
};

function buildDrivers<T extends Record<string, any>>(
  currentRows: T[],
  previousRows: T[] | undefined,
  key: keyof T,
  valueKey: keyof T
) {
  const currentMap = new Map(
    currentRows.map(row => [String(row[key]), Number(row[valueKey] ?? 0)])
  );
  const previousMap = new Map(
    (previousRows ?? []).map(row => [
      String(row[key]),
      Number(row[valueKey] ?? 0),
    ])
  );
  const labels = new Set([...currentMap.keys(), ...previousMap.keys()]);

  return Array.from(labels)
    .map(label => {
      const currentValue = currentMap.get(label) ?? 0;
      const previousValue = previousMap.get(label) ?? 0;
      const deltaAbs = currentValue - previousValue;
      const deltaPct =
        Math.abs(previousValue) > 0.0001
          ? (currentValue - previousValue) / previousValue
          : undefined;
      return { label, deltaAbs, deltaPct };
    })
    .sort((a, b) => Math.abs(b.deltaAbs) - Math.abs(a.deltaAbs));
}

function DriverRow({
  item,
  onClick,
}: {
  item: DriverItem;
  onClick: () => void;
}) {
  const positive = item.deltaAbs > 0.0001;
  const negative = item.deltaAbs < -0.0001;
  const toneClass = getDeltaToneClass(item.deltaAbs, true);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-left transition-colors hover:border-border/80"
    >
      <div>
        <div className="text-sm font-medium text-foreground">{item.label}</div>
        <div className="text-xs text-muted-foreground">
          {item.deltaPct !== undefined
            ? formatPercent(item.deltaPct)
            : "Sem base comparativa"}
        </div>
      </div>
      <div
        className={`inline-flex items-center gap-1 text-sm font-semibold ${toneClass}`}
      >
        {positive ? (
          <ArrowUpRight size={14} />
        ) : negative ? (
          <ArrowDownRight size={14} />
        ) : (
          <Minus size={14} />
        )}
        {formatCurrency(item.deltaAbs)}
      </div>
    </button>
  );
}

function CurrentLeaders({
  sellers,
  products,
  onSellerClick,
  onProductClick,
}: {
  sellers: GestaoSellerRow[];
  products: GestaoProductRow[];
  onSellerClick: (seller: string) => void;
  onProductClick: (product: string) => void;
}) {
  const topSeller = sellers.slice().sort((a, b) => b.comissao - a.comissao)[0];
  const topProduct = products
    .slice()
    .sort((a, b) => b.comissao - a.comissao)[0];

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <button
        type="button"
        className="rounded-xl border border-border bg-muted/30 px-4 py-4 text-left transition-colors hover:border-border/80"
        onClick={() => topSeller && onSellerClick(topSeller.vendedor)}
      >
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Driver atual por vendedora
        </div>
        <div className="mt-2 text-lg font-semibold text-foreground">
          {topSeller?.vendedor ?? "Sem dado"}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {topSeller
            ? formatCurrency(topSeller.comissao)
            : "Sem leitura disponível"}
        </div>
      </button>
      <button
        type="button"
        className="rounded-xl border border-border bg-muted/30 px-4 py-4 text-left transition-colors hover:border-border/80"
        onClick={() => topProduct && onProductClick(topProduct.produto)}
      >
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Driver atual por produto
        </div>
        <div className="mt-2 text-lg font-semibold text-foreground">
          {topProduct?.produto ?? "Sem dado"}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {topProduct
            ? formatCurrency(topProduct.comissao)
            : "Sem leitura disponível"}
        </div>
      </button>
    </div>
  );
}

export function VariationDrivers({
  current,
  comparison,
  onSellerClick,
  onProductClick,
  onOperationClick,
}: VariationDriversProps) {
  const sellerDrivers = buildDrivers(
    current.bySeller,
    comparison?.bySeller,
    "vendedor",
    "comissao"
  ).slice(0, 3);
  const productDrivers = buildDrivers(
    current.byProduct,
    comparison?.byProduct,
    "produto",
    "comissao"
  ).slice(0, 3);
  const operationDrivers = buildDrivers(
    current.byOperationType,
    comparison?.byOperationType,
    "tipoOperacao",
    "comissao"
  ).slice(0, 3);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Análise de Drivers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!comparison && (
          <>
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
              Ative a comparação de período para decompor a variação em impacto
              absoluto por vendedora, produto e operação.
            </div>
            <CurrentLeaders
              sellers={current.bySeller}
              products={current.byProduct}
              onSellerClick={onSellerClick}
              onProductClick={onProductClick}
            />
          </>
        )}

        {comparison && (
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Vendedoras
                </h3>
                <div className="text-xs text-muted-foreground">
                  impacto em comissão
                </div>
              </div>
              {sellerDrivers.map(item => (
                <DriverRow
                  key={item.label}
                  item={item}
                  onClick={() => onSellerClick(item.label)}
                />
              ))}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Produtos
                </h3>
                <div className="text-xs text-muted-foreground">
                  impacto em comissão
                </div>
              </div>
              {productDrivers.map(item => (
                <DriverRow
                  key={item.label}
                  item={item}
                  onClick={() => onProductClick(item.label)}
                />
              ))}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Operações
                </h3>
                <div className="text-xs text-muted-foreground">
                  impacto em comissão
                </div>
              </div>
              {operationDrivers.map(item => (
                <DriverRow
                  key={item.label}
                  item={item}
                  onClick={() => onOperationClick(item.label)}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
