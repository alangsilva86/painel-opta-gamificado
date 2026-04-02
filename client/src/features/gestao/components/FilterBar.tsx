import {
  Activity,
  ArrowRightLeft,
  Download,
  FilterX,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

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
  appliedDateFrom?: string;
  appliedDateTo?: string;
  hasFetched?: boolean;
  hasPendingChanges?: boolean;
};

function formatDateLabel(value?: string) {
  if (!value) return "Período não definido";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function summarizeSelection(
  count: number,
  singular: string,
  plural: string,
  emptyLabel: string
) {
  if (count === 0) return emptyLabel;
  return `${count} ${count === 1 ? singular : plural}`;
}

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
        <div className={`status-chip cursor-default ${badgeClass}`}>
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
  appliedDateFrom,
  appliedDateTo,
  hasFetched = false,
  hasPendingChanges = false,
}: FilterBarProps) {
  const freshnessBadge = freshness
    ? getToneClasses(getFreshnessTone(freshness.status)).badgeClass
    : "";
  const qualityBadge = dataQuality
    ? getExecutiveStatusTone(dataQuality.status).badgeClass
    : "";
  const appliedPeriodLabel =
    hasFetched && appliedDateFrom && appliedDateTo
      ? `${formatDateLabel(appliedDateFrom)} - ${formatDateLabel(appliedDateTo)}`
      : "Aguardando primeiro carregamento";
  const draftScopeLabel = [
    summarizeSelection(
      selectedSellers.length,
      "vendedora",
      "vendedoras",
      "todas as vendedoras"
    ),
    summarizeSelection(
      selectedProducts.length,
      "produto",
      "produtos",
      "todos os produtos"
    ),
    incluirSemComissao ? "inclui sem comissão" : "oculta sem comissão",
  ].join(" · ");
  const recorteStateClass = hasPendingChanges
    ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
    : "border-primary/30 bg-primary/10 text-primary-foreground";
  const applyDisabled =
    isApplying || isRefreshing || (hasFetched && !hasPendingChanges);

  return (
    <div className="-mx-4 px-4 pt-2">
      <div className="panel-card-strong px-4 py-3 sm:px-5">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-background/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <Sparkles size={10} />
                Gestão Executiva
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-black tracking-tight text-foreground">
                  Recorte e leitura do período
                </h1>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  Ajuste o recorte, aplique e siga para os indicadores. As ações
                  de atualização e exportação usam sempre o período já
                  carregado.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="status-chip border-border/70 bg-background/60 text-foreground">
                  {hasFetched
                    ? `Aplicado: ${appliedPeriodLabel}`
                    : "Recorte ainda não carregado"}
                </div>
                <div className={cn("status-chip", recorteStateClass)}>
                  {hasPendingChanges
                    ? "Rascunho pendente"
                    : hasFetched
                      ? "Sem pendências"
                      : "Pronto para consulta"}
                </div>
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
                    badgeClass={
                      getExecutiveStatusTone(businessStatus.status).badgeClass
                    }
                  />
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
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
                    triggerClassName="h-9 rounded-xl border-white/10 bg-background/72 text-foreground"
                  />
                )}
              <MetricGlossaryDrawer triggerClassName="h-9 rounded-xl border-white/10 bg-background/72 text-foreground" />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRefresh}
                disabled={!hasFetched || isRefreshing}
                className="rounded-xl border-white/10 bg-background/72 text-foreground"
              >
                <RefreshCw
                  className={cn("size-4", isRefreshing && "animate-spin")}
                />
                {isRefreshing ? "Atualizando…" : "Atualizar"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onExport}
                disabled={!hasFetched || isExporting}
                className="rounded-xl border-white/10 bg-background/72 text-foreground"
              >
                <Download className="size-4" />
                {isExporting ? "Exportando…" : "Exportar"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,165px)_minmax(0,165px)_minmax(0,170px)_minmax(0,220px)_minmax(0,220px)_auto]">
            <div className="space-y-1.5">
              <label htmlFor="gestao-date-from" className="metric-label">
                Início
              </label>
              <Input
                id="gestao-date-from"
                name="gestao-date-from"
                type="date"
                autoComplete="off"
                value={dateFrom}
                onChange={e => onDateFromChange(e.target.value)}
                className="h-10 rounded-xl border-white/10 bg-background/72 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="gestao-date-to" className="metric-label">
                Fim
              </label>
              <Input
                id="gestao-date-to"
                name="gestao-date-to"
                type="date"
                autoComplete="off"
                value={dateTo}
                onChange={e => onDateToChange(e.target.value)}
                className="h-10 rounded-xl border-white/10 bg-background/72 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sem-comissao" className="metric-label">
                Sem comissão
              </label>
              <Button
                id="sem-comissao"
                type="button"
                variant={incluirSemComissao ? "secondary" : "outline"}
                aria-pressed={incluirSemComissao}
                onClick={onToggleSemComissao}
                className="h-10 w-full justify-start rounded-xl border-white/10 bg-background/72 text-foreground"
              >
                {incluirSemComissao ? "Inclui" : "Oculta"}
              </Button>
            </div>

            {onToggleSeller && sellerOptions.length > 0 && (
              <div className="space-y-1.5">
                <label className="metric-label">Vendedoras</label>
                <MultiSelectDropdown
                  label="Vendedoras"
                  options={sellerOptions}
                  selected={selectedSellers}
                  onToggle={onToggleSeller}
                  triggerClassName="h-10 w-full min-w-0"
                />
              </div>
            )}

            {onToggleProduct && productOptions.length > 0 && (
              <div className="space-y-1.5">
                <label className="metric-label">Produtos</label>
                <MultiSelectDropdown
                  label="Produtos"
                  options={productOptions}
                  selected={selectedProducts}
                  onToggle={onToggleProduct}
                  triggerClassName="h-10 w-full min-w-0"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="metric-label">Comparação</label>
              <Button
                type="button"
                variant={comparisonMode ? "secondary" : "outline"}
                className="h-10 w-full justify-start rounded-xl border-white/10 bg-background/72 text-foreground xl:min-w-[172px]"
                onClick={() => onComparisonModeChange(!comparisonMode)}
                aria-pressed={comparisonMode}
              >
                <ArrowRightLeft className="size-4" />
                {comparisonMode ? "Comparação ativa" : "Ativar comparação"}
              </Button>
            </div>
          </div>

          {comparisonMode && (
            <div className="panel-inset rounded-2xl p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Compare o recorte atual com um período de referência.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-white/10 bg-background/72 text-foreground"
                      onClick={() => onComparisonPreset("prev_month")}
                    >
                      Mês anterior
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-white/10 bg-background/72 text-foreground"
                      onClick={() => onComparisonPreset("prev_week")}
                    >
                      Semana anterior
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-white/10 bg-background/72 text-foreground"
                      onClick={() => onComparisonPreset("prev_year")}
                    >
                      Ano anterior
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-xl text-muted-foreground"
                      onClick={() => onComparisonPreset("custom")}
                    >
                      Personalizado
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="gestao-comparison-from"
                      className="metric-label"
                    >
                      De
                    </label>
                    <Input
                      id="gestao-comparison-from"
                      name="gestao-comparison-from"
                      type="date"
                      autoComplete="off"
                      value={comparisonDateFrom}
                      onChange={e => onComparisonDateFromChange(e.target.value)}
                      className="h-10 rounded-xl border-white/10 bg-background/72 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="gestao-comparison-to"
                      className="metric-label"
                    >
                      Até
                    </label>
                    <Input
                      id="gestao-comparison-to"
                      name="gestao-comparison-to"
                      type="date"
                      autoComplete="off"
                      value={comparisonDateTo}
                      onChange={e => onComparisonDateToChange(e.target.value)}
                      className="h-10 rounded-xl border-white/10 bg-background/72 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-background/45 px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="text-xs text-muted-foreground">
                {hasPendingChanges
                  ? "Existem mudanças em rascunho esperando aplicação."
                  : hasFetched
                    ? "Nenhuma mudança pendente. O painel já está alinhado ao recorte aplicado."
                    : "Faça a primeira consulta para carregar indicadores, gráficos e auditoria."}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Rascunho:</span>{" "}
                {draftScopeLabel}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClear}
                className="h-9 rounded-xl px-3 text-muted-foreground"
              >
                <FilterX className="size-4" />
                Limpar
              </Button>
              <Button
                type="button"
                onClick={onApply}
                disabled={applyDisabled}
                className="h-10 rounded-xl px-5"
              >
                {isApplying
                  ? "Aplicando…"
                  : hasFetched
                    ? "Aplicar filtros"
                    : "Carregar painel"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
