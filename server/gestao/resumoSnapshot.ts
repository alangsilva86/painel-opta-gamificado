import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import {
  contratos,
  gestaoMetas,
  gestaoSyncLogs,
  metasVendedor,
  vendedoras,
} from "../../drizzle/schema";
import { isProdutoIgnoradoNoPainelVendedoras } from "../calculationService";
import { getDb } from "../db";
import { buildExecutiveLayer } from "./executive";

export const FILTERS_SCHEMA = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  etapaPipeline: z.array(z.string()).optional(),
  vendedorNome: z.array(z.string()).optional(),
  produto: z.array(z.string()).optional(),
  tipoOperacao: z.array(z.string()).optional(),
  agenteId: z.array(z.string()).optional(),
  digitadorNome: z.array(z.string()).optional(),
});

export type GestaoResumoFilters = z.infer<typeof FILTERS_SCHEMA>;

export function buildWhere(filters: GestaoResumoFilters) {
  const clauses: any[] = [];
  if (filters.dateFrom) {
    const start = new Date(filters.dateFrom);
    start.setHours(0, 0, 0, 0);
    clauses.push(gte(contratos.dataPagamento, start));
  }
  if (filters.dateTo) {
    const end = new Date(filters.dateTo);
    end.setHours(23, 59, 59, 999);
    clauses.push(lte(contratos.dataPagamento, end));
  }
  if (filters.etapaPipeline?.length) {
    clauses.push(inArray(contratos.etapaPipeline, filters.etapaPipeline));
  }
  if (filters.vendedorNome?.length) {
    clauses.push(inArray(contratos.vendedorNome, filters.vendedorNome));
  }
  if (filters.produto?.length) {
    clauses.push(inArray(contratos.produto, filters.produto));
  }
  if (filters.tipoOperacao?.length) {
    clauses.push(inArray(contratos.tipoOperacao, filters.tipoOperacao));
  }
  if (filters.agenteId?.length) {
    clauses.push(inArray(contratos.agenteId, filters.agenteId));
  }
  if (filters.digitadorNome?.length) {
    clauses.push(inArray(contratos.digitadorNome, filters.digitadorNome));
  }

  return clauses.length > 0 ? and(...clauses) : undefined;
}

export function centsToNumber(value: number) {
  return value / 100;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
) {
  const map = new Map<K, T[]>();
  items.forEach(item => {
    const key = keyFn(item);
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  });
  return map;
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function diffDaysInclusive(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

function normalizeSellerName(value: string) {
  return value.trim().toLowerCase();
}

const COMISSAO_VENDEDORA_FACTOR = 0.55 * 0.06;

export function calcularComissaoVendedoraCent(contrato: {
  comissaoTotalCent: number;
  produto: string;
}) {
  if (contrato.comissaoTotalCent <= 0) return 0;
  if (isProdutoIgnoradoNoPainelVendedoras(contrato.produto)) return 0;
  return Math.round(contrato.comissaoTotalCent * COMISSAO_VENDEDORA_FACTOR);
}

export async function buildGestaoResumoSnapshot(input: GestaoResumoFilters) {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database indisponível",
    });
  }

  const where = buildWhere(input);
  const rows = await db.select().from(contratos).where(where);
  const latestSyncRow = await db
    .select({ createdAt: gestaoSyncLogs.createdAt })
    .from(gestaoSyncLogs)
    .orderBy(desc(gestaoSyncLogs.createdAt))
    .limit(1);

  const total = rows.length;
  const sumLiquido = rows.reduce((acc, row) => acc + row.liquidoLiberadoCent, 0);
  const sumComissao = rows.reduce((acc, row) => acc + row.comissaoTotalCent, 0);
  const semComissaoRows = rows.filter(row => row.comissaoTotalCent === 0);
  const sumLiquidoSemComissao = semComissaoRows.reduce(
    (acc, row) => acc + row.liquidoLiberadoCent,
    0
  );
  const rowsComissionados = rows.filter(row => row.comissaoTotalCent > 0);
  const sumLiquidoComissionados = rowsComissionados.reduce(
    (acc, row) => acc + row.liquidoLiberadoCent,
    0
  );
  const sumComissaoComissionados = rowsComissionados.reduce(
    (acc, row) => acc + row.comissaoTotalCent,
    0
  );
  const takeRate = sumLiquido > 0 ? sumComissao / sumLiquido : 0;
  const takeRateLimpo =
    sumLiquidoComissionados > 0
      ? sumComissaoComissionados / sumLiquidoComissionados
      : 0;
  const ticketMedio = total > 0 ? sumLiquido / total : 0;
  const pctComissaoCalculada =
    total > 0 ? rows.filter(row => row.comissaoCalculada).length / total : 0;
  const pctLiquidoFallback =
    total > 0 ? rows.filter(row => row.liquidoFallback).length / total : 0;
  const contratosSemComissao = semComissaoRows.length;

  let metaComissaoCent = 0;
  const monthKey = input.dateFrom?.slice(0, 7);
  const metasVendedorMap = new Map<string, number>();
  const vendedorIdByName = new Map<string, string>();
  if (monthKey) {
    const metaRow = await db
      .select()
      .from(gestaoMetas)
      .where(eq(gestaoMetas.mes, monthKey))
      .limit(1);
    if (metaRow.length > 0) {
      const parsedMeta = Number.parseFloat(metaRow[0].metaValor || "0");
      metaComissaoCent = Number.isNaN(parsedMeta)
        ? 0
        : Math.round(parsedMeta * 100);
    }
    const metasVendedorRows = await db
      .select()
      .from(metasVendedor)
      .where(eq(metasVendedor.mes, monthKey));
    metasVendedorRows.forEach(meta => {
      const parsed = Number.parseFloat(meta.metaValor || "0");
      metasVendedorMap.set(meta.vendedoraId, Number.isNaN(parsed) ? 0 : parsed);
    });
  }

  const vendedorasRows = await db
    .select({ id: vendedoras.id, nome: vendedoras.nome })
    .from(vendedoras);
  vendedorasRows.forEach(vendedora => {
    vendedorIdByName.set(normalizeSellerName(vendedora.nome), vendedora.id);
  });

  const startDate = input.dateFrom ? new Date(input.dateFrom) : rows[0]?.dataPagamento;
  const endDate = input.dateTo
    ? new Date(input.dateTo)
    : rows[rows.length - 1]?.dataPagamento;
  const now = new Date();
  const effectiveStart = startDate || now;
  const effectiveEnd = endDate || now;
  const totalDias = Math.max(1, diffDaysInclusive(effectiveStart, effectiveEnd));
  const diasDecorridos = Math.max(
    0,
    diffDaysInclusive(effectiveStart, now < effectiveEnd ? now : effectiveEnd)
  );

  const paceComissao = diasDecorridos > 0 ? sumComissao / diasDecorridos : 0;
  const diasRestantes = Math.max(0, totalDias - diasDecorridos);
  const faltaMetaComissao = Math.max(0, metaComissaoCent - sumComissao);
  const necessarioPorDia =
    metaComissaoCent > 0 && diasRestantes > 0
      ? faltaMetaComissao / diasRestantes
      : 0;

  const timeseriesMap = groupBy(rows, row => formatDateKey(row.dataPagamento));
  const timeseries = Array.from(timeseriesMap.entries())
    .map(([date, list]) => {
      const liquido = list.reduce(
        (acc, row) => acc + row.liquidoLiberadoCent,
        0
      );
      const comissao = list.reduce(
        (acc, row) => acc + row.comissaoTotalCent,
        0
      );
      const comissionados = list.filter(row => row.comissaoTotalCent > 0);
      const liquidoComissionado = comissionados.reduce(
        (acc, row) => acc + row.liquidoLiberadoCent,
        0
      );
      const comissaoComissionado = comissionados.reduce(
        (acc, row) => acc + row.comissaoTotalCent,
        0
      );
      const contratosSemComissaoDia = list.filter(
        row => row.comissaoTotalCent === 0
      ).length;

      return {
        date,
        contratos: list.length,
        contratosSemComissao: contratosSemComissaoDia,
        liquido: centsToNumber(liquido),
        comissao: centsToNumber(comissao),
        liquidoComissionado: centsToNumber(liquidoComissionado),
        comissaoComissionado: centsToNumber(comissaoComissionado),
        takeRate: liquido > 0 ? comissao / liquido : 0,
        takeRateLimpo:
          liquidoComissionado > 0
            ? comissaoComissionado / liquidoComissionado
            : 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  type ContratoRow = (typeof rows)[number];

  const aggregateGroup = (list: ContratoRow[]) => {
    const liquido = list.reduce((acc, row) => acc + row.liquidoLiberadoCent, 0);
    const comissaoBase = list.reduce(
      (acc, row) => acc + row.comissaoBaseCent,
      0
    );
    const comissaoBonus = list.reduce(
      (acc, row) => acc + row.comissaoBonusCent,
      0
    );
    const comissao = list.reduce(
      (acc, row) => acc + row.comissaoTotalCent,
      0
    );
    const comissaoVendedoraCent = list.reduce(
      (acc, row) => acc + calcularComissaoVendedoraCent(row),
      0
    );
    const comissionados = list.filter(row => row.comissaoTotalCent > 0);
    const liquidoComissionado = comissionados.reduce(
      (acc, row) => acc + row.liquidoLiberadoCent,
      0
    );
    const comissaoComissionado = comissionados.reduce(
      (acc, row) => acc + row.comissaoTotalCent,
      0
    );
    const semComissaoCount = list.length - comissionados.length;
    const comissaoCalculadaCount = list.filter(
      row => row.comissaoCalculada
    ).length;
    const liquidoFallbackCount = list.filter(row => row.liquidoFallback).length;
    const inconsistenciaDataCount = list.filter(
      row => row.inconsistenciaDataPagamento
    ).length;
    const ticketMedioGrupo = list.length > 0 ? liquido / list.length : 0;
    const ticketMedioComissionado =
      comissionados.length > 0
        ? liquidoComissionado / comissionados.length
        : 0;

    return {
      count: list.length,
      comissionadosCount: comissionados.length,
      semComissaoCount,
      comissaoCalculadaCount,
      liquidoFallbackCount,
      inconsistenciaDataCount,
      liquido: centsToNumber(liquido),
      comissao: centsToNumber(comissao),
      comissaoBase: centsToNumber(comissaoBase),
      comissaoBonus: centsToNumber(comissaoBonus),
      comissaoVendedora: centsToNumber(comissaoVendedoraCent),
      liquidoComissionado: centsToNumber(liquidoComissionado),
      comissaoComissionado: centsToNumber(comissaoComissionado),
      ticketMedio: centsToNumber(ticketMedioGrupo),
      ticketMedioComissionado: centsToNumber(ticketMedioComissionado),
      takeRate: liquido > 0 ? comissao / liquido : 0,
      takeRateLimpo:
        liquidoComissionado > 0
          ? comissaoComissionado / liquidoComissionado
          : 0,
      pctComissaoCalculada:
        list.length > 0 ? comissaoCalculadaCount / list.length : 0,
      pctLiquidoFallback:
        list.length > 0 ? liquidoFallbackCount / list.length : 0,
      pctInconsistenciaData:
        list.length > 0 ? inconsistenciaDataCount / list.length : 0,
    };
  };

  const byStage = Array.from(groupBy(rows, row => row.etapaPipeline).entries()).map(
    ([etapa, list]) => ({
      etapa,
      ...aggregateGroup(list),
    })
  );

  const bySeller = Array.from(groupBy(rows, row => row.vendedorNome).entries()).map(
    ([vendedor, list]) => {
      const aggregated = aggregateGroup(list);
      const vendedorId = vendedorIdByName.get(normalizeSellerName(vendedor));
      const meta = vendedorId ? (metasVendedorMap.get(vendedorId) ?? 0) : 0;
      const pctMeta = meta > 0 ? aggregated.liquido / meta : 0;

      return {
        vendedor,
        ...aggregated,
        meta,
        pctMeta,
        pctTotal: sumComissao > 0 ? aggregated.comissao / centsToNumber(sumComissao) : 0,
      };
    }
  );

  const byTyper = Array.from(groupBy(rows, row => row.digitadorNome).entries()).map(
    ([digitador, list]) => ({
      digitador,
      ...aggregateGroup(list),
    })
  );

  const byProduct = Array.from(groupBy(rows, row => row.produto).entries()).map(
    ([produto, list]) => ({
      produto,
      ...aggregateGroup(list),
    })
  );

  const byProductOperation = Array.from(
    groupBy(rows, row => row.produto).entries()
  ).map(([produto, list]) => {
    const operations = Array.from(
      groupBy(list, row => row.tipoOperacao).entries()
    )
      .map(([tipoOperacao, opList]) => ({
        tipoOperacao,
        ...aggregateGroup(opList),
      }))
      .sort((a, b) => b.comissao - a.comissao);
    return { produto, operations };
  });

  const byOperationType = Array.from(
    groupBy(rows, row => row.tipoOperacao).entries()
  ).map(([tipoOperacao, list]) => ({
    tipoOperacao,
    ...aggregateGroup(list),
  }));

  const alerts: Array<{
    type: string;
    title: string;
    severity: "info" | "warning" | "critical";
    detail: string;
    filters?: Partial<GestaoResumoFilters>;
    generatedAt?: Date;
  }> = [];

  if (rows.length > 0) {
    const sortedByDate = [...rows].sort(
      (a, b) => a.dataPagamento.getTime() - b.dataPagamento.getTime()
    );
    const lastDate = sortedByDate[sortedByDate.length - 1].dataPagamento;
    const toTs = lastDate.getTime();
    const fromLast7 = toTs - 7 * 24 * 3600 * 1000;
    const fromPrev7 = toTs - 14 * 24 * 3600 * 1000;

    const slice = (from: number, to: number) =>
      sortedByDate.filter(
        row => row.dataPagamento.getTime() > from && row.dataPagamento.getTime() <= to
      );

    const last7 = slice(fromLast7, toTs);
    const prev7 = slice(fromPrev7, fromLast7);

    const sum = (
      list: typeof rows,
      selector: (row: (typeof rows)[number]) => number
    ) => list.reduce((acc, row) => acc + selector(row), 0);

    const calcTakeRate = (list: typeof rows) => {
      const liquido = sum(list, row => row.liquidoLiberadoCent);
      const comissao = sum(list, row => row.comissaoTotalCent);
      return liquido > 0 ? comissao / liquido : 0;
    };

    const takeRateLast = calcTakeRate(last7);
    const takeRatePrev = calcTakeRate(prev7);

    if (takeRatePrev > 0 && takeRateLast < takeRatePrev * 0.9) {
      alerts.push({
        type: "takeRateDown",
        title: "Comissão média caindo",
        severity: "warning",
        detail: `Comissão média dos últimos 7 dias ${formatPercent(
          takeRateLast
        )} vs ${formatPercent(takeRatePrev)} na semana anterior.`,
        generatedAt: new Date(),
      });
    }

    const calcShare = (list: typeof rows) =>
      list.length > 0
        ? list.filter(row => row.comissaoCalculada).length / list.length
        : 0;
    const calcLast = calcShare(last7);
    const calcPrev = calcShare(prev7);

    if (calcPrev > 0 && calcLast - calcPrev >= 0.05 && calcLast > 0.1) {
      alerts.push({
        type: "calculatedCommissionRising",
        title: "% comissão calculada subindo",
        severity: "warning",
        detail: `${formatPercent(calcLast)} nos últimos 7 dias vs ${formatPercent(
          calcPrev
        )} na semana anterior.`,
        generatedAt: new Date(),
      });
    }

    const pctSemComissao = total > 0 ? contratosSemComissao / total : 0;
    if (pctSemComissao > 0.05 || sumLiquidoSemComissao > 5_000_000) {
      alerts.push({
        type: "semComissao",
        title: "Contratos pagos sem comissão",
        severity: "warning",
        detail: `Sem comissão: ${contratosSemComissao} (${formatPercent(
          pctSemComissao
        )}) | Líquido pendente ${formatPercent(
          sumLiquido > 0 ? sumLiquidoSemComissao / sumLiquido : 0
        )}`,
        generatedAt: new Date(),
      });
    }
  }

  if (sumComissao > 0) {
    const sellersSorted = bySeller
      .map(row => ({ vendedor: row.vendedor, comissao: row.comissao }))
      .sort((a, b) => b.comissao - a.comissao);
    const top5 = sellersSorted.slice(0, 5);
    const top5Sum = top5.reduce((acc, row) => acc + row.comissao, 0);
    const sumComissaoReais = sumComissao / 100;
    const shareReal = sumComissaoReais > 0 ? top5Sum / sumComissaoReais : 0;

    if (shareReal >= 0.7) {
      alerts.push({
        type: "top5ConcentrationHigh",
        title: "Concentração alta no Top 5",
        severity: "info",
        detail: `${formatPercent(shareReal)} da comissão concentrada nos Top 5 vendedores.`,
        filters: { vendedorNome: top5.map(row => row.vendedor) },
        generatedAt: new Date(),
      });
    }
  }

  const cards = {
    contratos: total,
    liquido: centsToNumber(sumLiquido),
    comissao: centsToNumber(sumComissao),
    takeRate,
    takeRateLimpo,
    ticketMedio: centsToNumber(ticketMedio),
    pctComissaoCalculada,
    contratosSemComissao,
    metaComissao: centsToNumber(metaComissaoCent),
    paceComissao: centsToNumber(paceComissao),
    necessarioPorDia: centsToNumber(necessarioPorDia),
    diasDecorridos,
    totalDias,
  };

  const executiveLayer = buildExecutiveLayer({
    cards,
    timeseries,
    byStage,
    bySeller,
    byProduct,
    byOperationType,
    alerts,
    latestSyncAt: latestSyncRow[0]?.createdAt ?? null,
    quality: {
      pctLiquidoFallback,
      pctComissaoCalculada,
      pctSemComissao: total > 0 ? contratosSemComissao / total : 0,
      totalRegistros: total,
    },
  });

  return {
    cards,
    timeseries,
    byStage,
    bySeller,
    byTyper,
    byProduct,
    byProductOperation,
    byOperationType,
    alerts,
    ...executiveLayer,
  };
}

export type GestaoResumoSnapshot = Awaited<
  ReturnType<typeof buildGestaoResumoSnapshot>
>;
