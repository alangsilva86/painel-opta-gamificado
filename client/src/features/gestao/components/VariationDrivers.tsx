import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  GestaoProductRow,
  GestaoResumoData,
  GestaoSellerRow,
} from "../types";

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

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

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
  const toneClass = positive
    ? "text-emerald-300"
    : negative
      ? "text-rose-300"
      : "text-slate-300";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-left transition-colors hover:border-slate-700"
    >
      <div>
        <div className="text-sm font-medium text-white">{item.label}</div>
        <div className="text-xs text-slate-500">
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
        className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-4 text-left transition-colors hover:border-slate-700"
        onClick={() => topSeller && onSellerClick(topSeller.vendedor)}
      >
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
          Driver atual por vendedora
        </div>
        <div className="mt-2 text-lg font-semibold text-white">
          {topSeller?.vendedor ?? "Sem dado"}
        </div>
        <div className="mt-1 text-sm text-slate-300">
          {topSeller
            ? formatCurrency(topSeller.comissao)
            : "Sem leitura disponível"}
        </div>
      </button>
      <button
        type="button"
        className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-4 text-left transition-colors hover:border-slate-700"
        onClick={() => topProduct && onProductClick(topProduct.produto)}
      >
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
          Driver atual por produto
        </div>
        <div className="mt-2 text-lg font-semibold text-white">
          {topProduct?.produto ?? "Sem dado"}
        </div>
        <div className="mt-1 text-sm text-slate-300">
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
    <Card className="border-slate-800 bg-slate-950">
      <CardHeader>
        <CardTitle className="text-white">Drivers & Risks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!comparison && (
          <>
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-4 text-sm text-slate-300">
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
                <h3 className="text-sm font-semibold text-white">Vendedoras</h3>
                <div className="text-xs text-slate-500">
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
                <h3 className="text-sm font-semibold text-white">Produtos</h3>
                <div className="text-xs text-slate-500">
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
                <h3 className="text-sm font-semibold text-white">Operações</h3>
                <div className="text-xs text-slate-500">
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
