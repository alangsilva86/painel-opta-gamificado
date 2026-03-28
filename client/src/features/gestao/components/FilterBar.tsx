import { Activity, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

function StatusPill({
  icon,
  label,
  tooltip,
  badgeClass,
}: {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  badgeClass: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`inline-flex cursor-default items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass}`}
        >
          {icon}
          {label}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[260px]">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
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
  const freshnessBadge = freshness
    ? getToneClasses(getFreshnessTone(freshness.status)).badgeClass
    : "";
  const qualityBadge = dataQuality
    ? getExecutiveStatusTone(dataQuality.status).badgeClass
    : "";

  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/92 px-4 py-3 backdrop-blur-xl">
      <div className="space-y-3">
        {/* Row 1: title + status pills + actions */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles size={10} />
              Gestão Executiva
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Cockpit comercial
            </h1>

            {freshness && (
              <StatusPill
                icon={<RefreshCw size={11} />}
                label={freshness.label}
                tooltip={freshness.detail}
                badgeClass={freshnessBadge}
              />
            )}
            {dataQuality && (
              <StatusPill
                icon={<ShieldCheck size={11} />}
                label={dataQuality.label}
                tooltip={`Score ${dataQuality.score}/100 · ${dataQuality.detail}`}
                badgeClass={qualityBadge}
              />
            )}
            {businessStatus && (
              <StatusPill
                icon={<Activity size={11} />}
                label={businessStatus.headline}
                tooltip={businessStatus.summary}
                badgeClass={getExecutiveStatusTone(businessStatus.status).badgeClass}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              size="sm"
              variant={comparisonMode ? "secondary" : "outline"}
              className="border-border bg-card text-foreground"
              onClick={() => onComparisonModeChange(!comparisonMode)}
            >
              {comparisonMode ? "Comparação ativa" : "Comparar período"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Atualizando..." : "Atualizar dados"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onApply}
              disabled={isApplying || isRefreshing}
            >
              {isApplying ? "Aplicando..." : "Aplicar filtros"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onExport}
              disabled={isExporting}
            >
              {isExporting ? "Exportando..." : "Exportar CSV"}
            </Button>
          </div>
        </div>

        {/* Row 2: filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Início</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => onDateFromChange(e.target.value)}
              className="h-8 border-input bg-card text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Fim</label>
            <Input
              type="date"
              value={dateTo}
              onChange={e => onDateToChange(e.target.value)}
              className="h-8 border-input bg-card text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              Sem comissão
            </label>
            <Button
              size="sm"
              variant={incluirSemComissao ? "secondary" : "outline"}
              onClick={onToggleSemComissao}
              className="h-8 justify-start border-border bg-card text-foreground"
            >
              {incluirSemComissao ? "Incluindo" : "Excluindo"}
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
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            className="h-8 text-muted-foreground"
          >
            Limpar filtros
          </Button>
        </div>

        {/* Row 3 (conditional): comparison period */}
        {comparisonMode && (
          <div className="rounded-xl border border-border bg-card/80 p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-border bg-secondary text-foreground"
                  onClick={() => onComparisonPreset("prev_month")}
                >
                  Mês anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-border bg-secondary text-foreground"
                  onClick={() => onComparisonPreset("prev_week")}
                >
                  Semana anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-border bg-secondary text-foreground"
                  onClick={() => onComparisonPreset("prev_year")}
                >
                  Mesmo período ano passado
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-muted-foreground"
                  onClick={() => onComparisonPreset("custom")}
                >
                  Personalizado
                </Button>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">De</label>
                <Input
                  type="date"
                  value={comparisonDateFrom}
                  onChange={e => onComparisonDateFromChange(e.target.value)}
                  className="h-8 border-input bg-background text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Até</label>
                <Input
                  type="date"
                  value={comparisonDateTo}
                  onChange={e => onComparisonDateToChange(e.target.value)}
                  className="h-8 border-input bg-background text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
