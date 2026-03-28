import { useMemo } from "react";
import type { GestaoHealthData, GestaoResumoData } from "./types";
import {
  aggregateTimeseries,
  mergeExecutiveMetricsWithComparison,
  type TimeseriesGranularity,
} from "./utils";

type ComparisonMetricDeltas = Partial<
  Record<
    | "comissao"
    | "liquido"
    | "takeRate"
    | "ticketMedio"
    | "contratos"
    | "pctComissaoCalculada"
    | "paceComissao"
    | "necessarioPorDia",
    number | undefined
  >
>;

type UseGestaoDerivedDataArgs = {
  resumoData?: GestaoResumoData;
  comparisonData?: GestaoResumoData | null;
  healthData?: GestaoHealthData | null;
  incluirSemComissao: boolean;
  granularity: TimeseriesGranularity;
  comparisonModeApplied: boolean;
};

function calculateDelta(current?: number | null, previous?: number | null) {
  if (
    typeof current !== "number" ||
    typeof previous !== "number" ||
    Math.abs(previous) < 0.0001
  ) {
    return undefined;
  }
  return (current - previous) / previous;
}

function getSellerMetricValue(
  row: { comissao: number; comissaoComissionado?: number },
  incluirSemComissao: boolean
) {
  return incluirSemComissao
    ? row.comissao
    : (row.comissaoComissionado ?? row.comissao);
}

function withDisplayValues<
  T extends {
    liquido: number;
    comissao: number;
    liquidoComissionado?: number;
    comissaoComissionado?: number;
  },
>(rows: T[], incluirSemComissao: boolean) {
  return rows.map(item => {
    const liquidoPlot = incluirSemComissao
      ? item.liquido
      : (item.liquidoComissionado ?? item.liquido);
    const comissaoPlot = incluirSemComissao
      ? item.comissao
      : (item.comissaoComissionado ?? item.comissao);
    const liquidoSem = incluirSemComissao
      ? Math.max(0, item.liquido - (item.liquidoComissionado ?? item.liquido))
      : 0;

    return { ...item, liquidoPlot, comissaoPlot, liquidoSem };
  });
}

export function useGestaoDerivedData({
  resumoData,
  comparisonData,
  healthData,
  incluirSemComissao,
  granularity,
  comparisonModeApplied,
}: UseGestaoDerivedDataArgs) {
  const deltas = useMemo(() => {
    const timeseries = resumoData?.timeseries ?? [];
    if (timeseries.length === 0) return { comissao: 0, liquido: 0 };

    const sorted = [...timeseries].sort((a, b) => a.date.localeCompare(b.date));
    const sliceSum = (
      rows: typeof sorted,
      startIdx: number,
      endIdx: number,
      key: "comissao" | "liquido"
    ) =>
      rows
        .slice(startIdx, endIdx)
        .reduce((acc, item) => acc + (item[key] ?? 0), 0);

    const last7Start = Math.max(0, sorted.length - 7);
    const prev7Start = Math.max(0, sorted.length - 14);
    const last7 = sliceSum(sorted, last7Start, sorted.length, "comissao");
    const prev7 = sliceSum(sorted, prev7Start, last7Start, "comissao");
    const last7Liquido = sliceSum(sorted, last7Start, sorted.length, "liquido");
    const prev7Liquido = sliceSum(sorted, prev7Start, last7Start, "liquido");

    return {
      comissao: prev7 > 0 ? (last7 - prev7) / prev7 : 0,
      liquido:
        prev7Liquido > 0 ? (last7Liquido - prev7Liquido) / prev7Liquido : 0,
    };
  }, [resumoData?.timeseries]);

  const flagCounts = useMemo(() => {
    const total = healthData?.totalRegistros ?? 0;
    return {
      calc: Math.round((healthData?.pctComissaoCalculada ?? 0) * total),
      liq: Math.round((healthData?.pctLiquidoFallback ?? 0) * total),
      dataInc: Math.round((healthData?.pctInconsistenciaData ?? 0) * total),
    };
  }, [healthData]);

  const timeseriesData = useMemo(() => {
    const timeseries = resumoData?.timeseries ?? [];
    const rows = timeseries.map(item => ({
      ...item,
      comissaoPlot:
        incluirSemComissao || item.comissaoComissionado === undefined
          ? item.comissao
          : item.comissaoComissionado,
      liquidoPlot:
        incluirSemComissao || item.liquidoComissionado === undefined
          ? item.liquido
          : item.liquidoComissionado,
    }));

    return aggregateTimeseries(rows, granularity).map(point => ({
      ...point,
      comissaoPlot:
        point.comissaoComissionado !== undefined && !incluirSemComissao
          ? point.comissaoComissionado
          : point.comissao,
      liquidoPlot:
        point.liquidoComissionado !== undefined && !incluirSemComissao
          ? point.liquidoComissionado
          : point.liquido,
    }));
  }, [granularity, incluirSemComissao, resumoData?.timeseries]);

  const stageData = useMemo(
    () => withDisplayValues(resumoData?.byStage ?? [], incluirSemComissao),
    [incluirSemComissao, resumoData?.byStage]
  );

  const productData = useMemo(
    () => withDisplayValues(resumoData?.byProduct ?? [], incluirSemComissao),
    [incluirSemComissao, resumoData?.byProduct]
  );

  const operationData = useMemo(
    () =>
      withDisplayValues(resumoData?.byOperationType ?? [], incluirSemComissao),
    [incluirSemComissao, resumoData?.byOperationType]
  );

  const sellersSorted = useMemo(
    () =>
      (resumoData?.bySeller ?? [])
        .slice()
        .sort((a, b) => b.comissao - a.comissao),
    [resumoData?.bySeller]
  );

  const productsSorted = useMemo(
    () =>
      (resumoData?.byProduct ?? [])
        .slice()
        .sort((a, b) => b.comissao - a.comissao),
    [resumoData?.byProduct]
  );

  const productOperationMap = useMemo(() => {
    const map = new Map<string, Array<any>>();
    (resumoData?.byProductOperation ?? []).forEach(item => {
      map.set(item.produto, item.operations ?? []);
    });
    return map;
  }, [resumoData?.byProductOperation]);

  const comparisonMetricDeltas = useMemo<ComparisonMetricDeltas>(() => {
    const previous = comparisonData?.cards;
    const current = resumoData?.cards;
    if (!previous || !current) return {};

    return {
      comissao: calculateDelta(current.comissao, previous.comissao),
      liquido: calculateDelta(current.liquido, previous.liquido),
      takeRate: calculateDelta(current.takeRate, previous.takeRate),
      ticketMedio: calculateDelta(current.ticketMedio, previous.ticketMedio),
      contratos: calculateDelta(current.contratos, previous.contratos),
      pctComissaoCalculada: calculateDelta(
        current.pctComissaoCalculada,
        previous.pctComissaoCalculada
      ),
      paceComissao: calculateDelta(current.paceComissao, previous.paceComissao),
      necessarioPorDia: calculateDelta(
        current.necessarioPorDia,
        previous.necessarioPorDia
      ),
    };
  }, [comparisonData?.cards, resumoData?.cards]);

  const sellerDeltas = useMemo(() => {
    if (!comparisonData) return undefined;

    const previousSellerMap = new Map(
      comparisonData.bySeller.map(seller => [
        seller.vendedor,
        getSellerMetricValue(seller, incluirSemComissao),
      ])
    );
    const deltasMap = new Map<string, number>();

    resumoData?.bySeller.forEach(seller => {
      const currentValue = getSellerMetricValue(seller, incluirSemComissao);
      const previousValue = previousSellerMap.get(seller.vendedor);
      const delta = calculateDelta(currentValue, previousValue);
      if (delta !== undefined) {
        deltasMap.set(seller.vendedor, delta);
      }
    });

    return deltasMap;
  }, [comparisonData, incluirSemComissao, resumoData?.bySeller]);

  const rankEvolution = useMemo(() => {
    if (!comparisonData || !resumoData) return undefined;

    const currentRankMap = new Map(
      resumoData.bySeller
        .slice()
        .sort(
          (a, b) =>
            getSellerMetricValue(b, incluirSemComissao) -
            getSellerMetricValue(a, incluirSemComissao)
        )
        .map((seller, index) => [seller.vendedor, index + 1])
    );
    const previousRankMap = new Map(
      comparisonData.bySeller
        .slice()
        .sort(
          (a, b) =>
            getSellerMetricValue(b, incluirSemComissao) -
            getSellerMetricValue(a, incluirSemComissao)
        )
        .map((seller, index) => [seller.vendedor, index + 1])
    );

    const evolutionMap = new Map<string, number>();
    currentRankMap.forEach((currentRank, seller) => {
      const previousRank = previousRankMap.get(seller);
      if (previousRank) {
        evolutionMap.set(seller, previousRank - currentRank);
      }
    });

    return evolutionMap;
  }, [comparisonData, incluirSemComissao, resumoData]);

  const availableSellers = useMemo(
    () =>
      (resumoData?.bySeller ?? [])
        .map(seller => seller.vendedor)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [resumoData?.bySeller]
  );

  const availableProducts = useMemo(
    () =>
      (resumoData?.byProduct ?? [])
        .map(product => product.produto)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [resumoData?.byProduct]
  );

  const executiveMetrics = useMemo(
    () =>
      mergeExecutiveMetricsWithComparison(
        resumoData?.executiveMetrics ?? [],
        comparisonModeApplied ? comparisonData?.executiveMetrics : null
      ),
    [
      comparisonData?.executiveMetrics,
      comparisonModeApplied,
      resumoData?.executiveMetrics,
    ]
  );

  return {
    availableProducts,
    availableSellers,
    comparisonMetricDeltas,
    comparisonResumo: comparisonModeApplied ? (comparisonData ?? null) : null,
    deltas,
    executiveMetrics,
    flagCounts,
    operationData,
    productData,
    productOperationMap,
    productsSorted,
    rankEvolution,
    sellerDeltas,
    sellersSorted,
    stageData,
    timeseriesData,
  };
}
