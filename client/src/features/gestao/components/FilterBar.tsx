import { Activity, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelectDropdown } from "./MultiSelectDropdown";
import { MetricGlossaryDrawer } from "./MetricGlossaryDrawer";
import { SavedViewsManager } from "./SavedViewsManager";
import type {
  GestaoBusinessStatus,
  GestaoDataQualityInfo,
  GestaoFreshnessInfo,
  GestaoSavedView,
} from "../types";
import {
  getExecutiveStatusTone,
  getFreshnessTone,
  getToneClasses,
} from "../visualSemantics";

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
  freshness?: GestaoFreshnessInfo | null;
  dataQuality?: GestaoDataQualityInfo | null;
  businessStatus?: GestaoBusinessStatus | null;
  presetViews?: GestaoSavedView[];
  customViews?: GestaoSavedView[];
  activeViewId?: string | null;
  onApplySavedView?: (view: GestaoSavedView) => void;
  onSaveView?: (name: string) => void;
  onRenameView?: (id: string, name: string) => void;
  onDuplicateView?: (id: string) => void;
  onDeleteView?: (id: string) => void;
  onResetView?: () => void;
  onRestoreLastView?: () => void;
  lastViewName?: string | null;
};

function getFreshnessClass(status?: GestaoFreshnessInfo["status"]) {
  return getToneClasses(getFreshnessTone(status)).panelClass;
}

function getQualityClass(status?: GestaoDataQualityInfo["status"]) {
  return getExecutiveStatusTone(status).panelClass;
}

function getBusinessClass(status?: GestaoBusinessStatus["status"]) {
  return getExecutiveStatusTone(status).panelClass;
}

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
  freshness,
  dataQuality,
  businessStatus,
  presetViews = [],
  customViews = [],
  activeViewId,
  onApplySavedView,
  onSaveView,
  onRenameView,
  onDuplicateView,
  onDeleteView,
  onResetView,
  onRestoreLastView,
  lastViewName,
}: FilterBarProps) {
  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/92 px-4 pb-4 pt-4 backdrop-blur-xl">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <Sparkles size={12} />
                Gestão Executiva
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground">
                Cockpit de inteligência comercial
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Leitura rápida do negócio, comparação sem ambiguidade e
                autonomia para navegar sem depender de interpretação manual.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {businessStatus && (
                <div
                  className={`rounded-2xl border px-4 py-3 ${getBusinessClass(
                    businessStatus.status
                  )}`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Activity size={14} />
                    {businessStatus.headline}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {businessStatus.summary}
                  </div>
                </div>
              )}
              {freshness && (
                <div
                  className={`rounded-2xl border px-4 py-3 ${getFreshnessClass(
                    freshness.status
                  )}`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <RefreshCw size={14} />
                    {freshness.label}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {freshness.detail}
                  </div>
                </div>
              )}
              {dataQuality && (
                <div
                  className={`rounded-2xl border px-4 py-3 ${getQualityClass(
                    dataQuality.status
                  )}`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck size={14} />
                    {dataQuality.label}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Score {dataQuality.score}/100 · {dataQuality.detail}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:max-w-[480px] xl:justify-end">
            {onApplySavedView &&
              onSaveView &&
              onRenameView &&
              onDuplicateView &&
              onDeleteView &&
              onResetView && (
                <SavedViewsManager
                  presetViews={presetViews}
                  customViews={customViews}
                  activeViewId={activeViewId}
                  onApply={onApplySavedView}
                  onSave={onSaveView}
                  onRename={onRenameView}
                  onDuplicate={onDuplicateView}
                  onDelete={onDeleteView}
                  onReset={onResetView}
                  onRestoreLast={onRestoreLastView}
                  lastViewName={lastViewName}
                />
              )}
            <MetricGlossaryDrawer />
            <Button
              type="button"
              variant={comparisonMode ? "secondary" : "outline"}
              className="border-border bg-card text-foreground"
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
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.1fr_1fr_1fr_auto_auto_auto]">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Data início</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => onDateFromChange(e.target.value)}
              className="border-input bg-card"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Data fim</label>
            <Input
              type="date"
              value={dateTo}
              onChange={e => onDateToChange(e.target.value)}
              className="border-input bg-card"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              Contratos sem comissão
            </label>
            <Button
              variant={incluirSemComissao ? "secondary" : "outline"}
              onClick={onToggleSemComissao}
              className="justify-start border-border bg-card text-foreground"
            >
              {incluirSemComissao
                ? "Incluindo no recorte"
                : "Excluindo do recorte"}
            </Button>
          </div>
          {onToggleSeller && sellerOptions.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">
                Vendedoras
              </label>
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
              <label className="text-xs text-muted-foreground">Produtos</label>
              <MultiSelectDropdown
                label="Produtos"
                options={productOptions}
                selected={selectedProducts}
                onToggle={onToggleProduct}
              />
            </div>
          )}
          <div className="flex items-end">
            <Button
              variant="ghost"
              onClick={onClear}
              className="text-muted-foreground"
            >
              Limpar filtros
            </Button>
          </div>
        </div>

        {comparisonMode && (
          <div className="rounded-2xl border border-border bg-card/80 p-4">
            <div className="grid gap-4 xl:grid-cols-[auto_auto_auto_1fr_1fr] xl:items-end">
              <div className="flex flex-wrap gap-2 xl:col-span-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border bg-secondary text-foreground"
                  onClick={() => onComparisonPreset("prev_month")}
                >
                  Mês anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border bg-secondary text-foreground"
                  onClick={() => onComparisonPreset("prev_week")}
                >
                  Semana anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border bg-secondary text-foreground"
                  onClick={() => onComparisonPreset("prev_year")}
                >
                  Mesmo período ano passado
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => onComparisonPreset("custom")}
                >
                  Personalizado
                </Button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Comparar de
                </label>
                <Input
                  type="date"
                  value={comparisonDateFrom}
                  onChange={e => onComparisonDateFromChange(e.target.value)}
                  className="border-input bg-background"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Comparar até
                </label>
                <Input
                  type="date"
                  value={comparisonDateTo}
                  onChange={e => onComparisonDateToChange(e.target.value)}
                  className="border-input bg-background"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
