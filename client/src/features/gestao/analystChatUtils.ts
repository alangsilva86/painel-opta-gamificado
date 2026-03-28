import type {
  GestaoAnalystMessage,
  GestaoResumoData,
  GestaoViewState,
} from "./types";

export const GESTAO_ANALYST_INITIAL_PROMPTS = [
  "Por que estamos atrás da meta neste recorte?",
  "Qual o principal risco para fechar o período?",
  "Mostre o melhor recorte para investigar take rate.",
];

function summarizeSelection(label: string, values: string[]) {
  if (values.length === 0) return `${label}: todos`;
  if (values.length <= 2) return `${label}: ${values.join(", ")}`;
  return `${label}: ${values.slice(0, 2).join(", ")} +${values.length - 2}`;
}

export function buildGestaoAnalystContextLabel(
  viewState: GestaoViewState,
  resumoData?: GestaoResumoData | null
) {
  const parts = [
    `Período ${viewState.dateFrom} a ${viewState.dateTo}`,
    summarizeSelection("Etapas", viewState.filterState.etapaPipeline),
    summarizeSelection("Vendedoras", viewState.filterState.vendedorNome),
    summarizeSelection("Produtos", viewState.filterState.produto),
    summarizeSelection("Operações", viewState.filterState.tipoOperacao),
    viewState.incluirSemComissao
      ? "Inclui sem comissão"
      : "Oculta sem comissão",
    `Granularidade ${viewState.granularity}`,
  ];

  if (
    viewState.comparisonMode &&
    viewState.comparisonDateFrom &&
    viewState.comparisonDateTo
  ) {
    parts.push(
      `Comparação ${viewState.comparisonDateFrom} a ${viewState.comparisonDateTo}`
    );
  }

  if (resumoData?.businessStatus.headline) {
    parts.push(resumoData.businessStatus.headline);
  }

  return parts.join(" • ");
}

export function buildGestaoAnalystContextSignature(viewState: GestaoViewState) {
  return JSON.stringify({
    dateFrom: viewState.dateFrom,
    dateTo: viewState.dateTo,
    comparisonMode: viewState.comparisonMode,
    comparisonDateFrom: viewState.comparisonDateFrom,
    comparisonDateTo: viewState.comparisonDateTo,
    filterState: viewState.filterState,
    flagFilters: viewState.flagFilters,
    incluirSemComissao: viewState.incluirSemComissao,
    granularity: viewState.granularity,
    activeViewId: viewState.activeViewId || null,
  });
}

export function createGestaoAnalystMessage(
  role: GestaoAnalystMessage["role"],
  content: string,
  response?: GestaoAnalystMessage["response"]
): GestaoAnalystMessage {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `analyst_${Math.random().toString(36).slice(2, 10)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    response,
  };
}

export function createGestaoAnalystContextUpdatedMessage(contextLabel: string) {
  return createGestaoAnalystMessage(
    "system",
    `Contexto atualizado para novo recorte. ${contextLabel}`
  );
}
