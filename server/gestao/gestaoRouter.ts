import { createHash, timingSafeEqual } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { contratos, gestaoMetas, gestaoSyncLogs, metasGlobal } from "../../drizzle/schema";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { nanoid } from "nanoid";
import { syncContratosGestao, syncContratosGestaoIntervalo } from "./syncService";

const FILTERS_SCHEMA = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  etapaPipeline: z.array(z.string()).optional(),
  vendedorNome: z.array(z.string()).optional(),
  produto: z.array(z.string()).optional(),
  tipoOperacao: z.array(z.string()).optional(),
  agenteId: z.array(z.string()).optional(),
  digitadorNome: z.array(z.string()).optional(),
});

const DRILLDOWN_SCHEMA = FILTERS_SCHEMA.extend({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
  somenteComissaoCalculada: z.boolean().optional(),
  somenteLiquidoFallback: z.boolean().optional(),
  somenteInconsistenciaData: z.boolean().optional(),
  somenteSemComissao: z.boolean().optional(),
  sortBy: z.enum(["data", "comissao", "liquido", "takeRate"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

function parseCookies(cookieHeader?: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.split("=");
    if (!key) return acc;
    acc[key.trim()] = decodeURIComponent(rest.join("=").trim());
    return acc;
  }, {});
}

function hasGestaoAccess(req: any): boolean {
  const cookies = parseCookies(req?.headers?.cookie);
  return cookies["gestao_access"] === "1";
}

const gestaoProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!hasGestaoAccess(ctx.req)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Acesso Gestão não autorizado" });
  }
  return next();
});

type SyncJobStatus = {
  id: string;
  status: "pending" | "running" | "done";
  totalMonths: number;
  completedMonths: number;
  perMonth: Array<{
    mesInicio: string;
    mesFim: string;
    status: "done" | "error";
    fetched: number;
    upserted: number;
    unchanged: number;
    skipped: number;
    durationMs: number;
    warnings?: string | null;
  }>;
  startedAt: Date;
  finishedAt?: Date;
};

const syncJobs = new Map<string, SyncJobStatus>();

function buildWhere(filters: z.infer<typeof FILTERS_SCHEMA>) {
  const clauses: any[] = [];
  if (filters.dateFrom) {
    const start = new Date(filters.dateFrom);
    start.setHours(0, 0, 0, 0);
    clauses.push(gte(contratos.dataPagamento, start));
  }
  if (filters.dateTo) {
    const end = new Date(filters.dateTo);
    end.setHours(23, 59, 59, 999); // incluir todo o dia final
    clauses.push(lte(contratos.dataPagamento, end));
  }
  if (filters.etapaPipeline?.length) clauses.push(inArray(contratos.etapaPipeline, filters.etapaPipeline));
  if (filters.vendedorNome?.length) clauses.push(inArray(contratos.vendedorNome, filters.vendedorNome));
  if (filters.produto?.length) clauses.push(inArray(contratos.produto, filters.produto));
  if (filters.tipoOperacao?.length) clauses.push(inArray(contratos.tipoOperacao, filters.tipoOperacao));
  if (filters.agenteId?.length) clauses.push(inArray(contratos.agenteId, filters.agenteId));
  if (filters.digitadorNome?.length) clauses.push(inArray(contratos.digitadorNome, filters.digitadorNome));

  return clauses.length > 0 ? and(...clauses) : undefined;
}

function centsToNumber(v: number) {
  return v / 100;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function groupBy<T, K extends string | number>(items: T[], keyFn: (item: T) => K) {
  const map = new Map<K, T[]>();
  items.forEach((item) => {
    const key = keyFn(item);
    const arr = map.get(key) || [];
    arr.push(item);
    map.set(key, arr);
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

export const gestaoRouter = router({
  auth: publicProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const expectedHash = process.env.GESTAO_PASSWORD_HASH;
      if (!expectedHash) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "GESTAO_PASSWORD_HASH não configurado",
        });
      }

      const providedHash = createHash("sha256").update(input.password).digest();
      const expected = Buffer.from(expectedHash, expectedHash.length === 64 ? "hex" : "utf8");

      if (expected.length !== providedHash.length || !timingSafeEqual(expected, providedHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha inválida" });
      }

      const cookieOptions = {
        ...getSessionCookieOptions(ctx.req),
        maxAge: 8 * 60 * 60 * 1000, // 8h
      };
      ctx.res.cookie("gestao_access", "1", cookieOptions);
      return { success: true };
    }),

  getResumo: gestaoProcedure.input(FILTERS_SCHEMA).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database indisponível" });
    const where = buildWhere(input);
    const rows = await db.select().from(contratos).where(where);

    const total = rows.length;
    const sumLiquido = rows.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0);
    const sumComissao = rows.reduce((acc, r) => acc + r.comissaoTotalCent, 0);
    const semComissao = rows.filter((r) => r.comissaoTotalCent === 0);
    const sumLiquidoSemComissao = semComissao.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0);
    const rowsComissionados = rows.filter((r) => r.comissaoTotalCent > 0);
    const sumLiquidoComissionados = rowsComissionados.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0);
    const sumComissaoComissionados = rowsComissionados.reduce((acc, r) => acc + r.comissaoTotalCent, 0);
    const takeRate = sumLiquido > 0 ? sumComissao / sumLiquido : 0;
    const takeRateLimpo =
      sumLiquidoComissionados > 0 ? sumComissaoComissionados / sumLiquidoComissionados : 0;
    const ticketMedio = total > 0 ? sumLiquido / total : 0;
    const pctComissaoCalculada =
      total > 0 ? rows.filter((r) => r.comissaoCalculada).length / total : 0;
    const contratosSemComissao = rows.filter((r) => r.comissaoTotalCent === 0).length;

    // Meta e ritmo (pace) - meta de comissão da gestão (separada da meta de vendas)
    let metaComissaoCent = 0;
    const monthKey = input.dateFrom?.slice(0, 7);
    if (monthKey) {
      const metaRow = await db.select().from(gestaoMetas).where(eq(gestaoMetas.mes, monthKey)).limit(1);
      if (metaRow.length > 0) {
        const parsedMeta = Number.parseFloat(metaRow[0].metaValor || "0");
        metaComissaoCent = Number.isNaN(parsedMeta) ? 0 : Math.round(parsedMeta * 100);
      }
    }

    const startDate = input.dateFrom ? new Date(input.dateFrom) : rows[0]?.dataPagamento;
    const endDate = input.dateTo ? new Date(input.dateTo) : rows[rows.length - 1]?.dataPagamento;
    const now = new Date();
    const effectiveStart = startDate ? startDate : now;
    const effectiveEnd = endDate ? endDate : now;
    const totalDias =
      effectiveStart && effectiveEnd ? Math.max(1, diffDaysInclusive(effectiveStart, effectiveEnd)) : 1;
    const diasDecorridos =
      effectiveStart && effectiveEnd
        ? Math.max(0, diffDaysInclusive(effectiveStart, now < effectiveEnd ? now : effectiveEnd))
        : 0;

    const paceComissao = diasDecorridos > 0 ? sumComissao / diasDecorridos : 0;
    const diasRestantes = Math.max(0, totalDias - diasDecorridos);
    const faltaMetaComissao = Math.max(0, metaComissaoCent - sumComissao);
    const necessarioPorDia =
      metaComissaoCent > 0 && diasRestantes > 0 ? faltaMetaComissao / diasRestantes : 0;

    const timeseriesMap = groupBy(rows, (r) => formatDateKey(r.dataPagamento));
    const timeseries = Array.from(timeseriesMap.entries())
      .map(([date, list]) => {
        const liquido = list.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0);
        const comissao = list.reduce((acc, r) => acc + r.comissaoTotalCent, 0);
        const comiss = list.filter((r) => r.comissaoTotalCent > 0);
        const liquidoComiss = comiss.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0);
        const comissaoComiss = comiss.reduce((acc, r) => acc + r.comissaoTotalCent, 0);
        const contratosSemComissaoDia = list.filter((r) => r.comissaoTotalCent === 0).length;
        return {
          date,
          contratos: list.length,
          contratosSemComissao: contratosSemComissaoDia,
          liquido: centsToNumber(liquido),
          comissao: centsToNumber(comissao),
          liquidoComissionado: centsToNumber(liquidoComiss),
          comissaoComissionado: centsToNumber(comissaoComiss),
          takeRate: liquido > 0 ? comissao / liquido : 0,
          takeRateLimpo: liquidoComiss > 0 ? comissaoComiss / liquidoComiss : 0,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const aggregateGroup = <T extends { liquidoLiberadoCent: number; comissaoTotalCent: number }>(
      list: T[]
    ) => {
      const liquido = list.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0);
      const comissao = list.reduce((acc, r) => acc + r.comissaoTotalCent, 0);
      const comiss = list.filter((r) => r.comissaoTotalCent > 0);
      const liquidoComiss = comiss.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0);
      const comissaoComiss = comiss.reduce((acc, r) => acc + r.comissaoTotalCent, 0);
      const semComissaoCount = list.filter((r) => r.comissaoTotalCent === 0).length;
      return {
        count: list.length,
        semComissaoCount,
        liquido: centsToNumber(liquido),
        comissao: centsToNumber(comissao),
        liquidoComissionado: centsToNumber(liquidoComiss),
        comissaoComissionado: centsToNumber(comissaoComiss),
        takeRate: liquido > 0 ? comissao / liquido : 0,
        takeRateLimpo: liquidoComiss > 0 ? comissaoComiss / liquidoComiss : 0,
      };
    };

    const byStage = Array.from(groupBy(rows, (r) => r.etapaPipeline).entries()).map(
      ([etapa, list]) => {
        const ag = aggregateGroup(list);
        return { etapa, ...ag };
      }
    );

    const bySeller = Array.from(groupBy(rows, (r) => r.vendedorNome).entries()).map(
      ([vendedor, list]) => {
        const ag = aggregateGroup(list);
        return {
          vendedor,
          ...ag,
          pctTotal: sumComissao > 0 ? ag.comissao / centsToNumber(sumComissao) : 0,
        };
      }
    );

    const byTyper = Array.from(groupBy(rows, (r) => r.digitadorNome).entries()).map(
      ([digitador, list]) => {
        const ag = aggregateGroup(list);
        return { digitador, ...ag };
      }
    );

    const byProduct = Array.from(groupBy(rows, (r) => r.produto).entries()).map(
      ([produto, list]) => {
        const ag = aggregateGroup(list);
        return { produto, ...ag };
      }
    );

    const byOperationType = Array.from(groupBy(rows, (r) => r.tipoOperacao).entries()).map(
      ([tipoOperacao, list]) => {
        const ag = aggregateGroup(list);
        return { tipoOperacao, ...ag };
      }
    );

    // Alertas
    const alerts: Array<{
      type: string;
      title: string;
      severity: "info" | "warning" | "critical";
      detail: string;
      filters?: Partial<z.infer<typeof FILTERS_SCHEMA>>;
      generatedAt?: Date;
    }> = [];

    // Comissão média caindo (últimos 7 dias vs 7 anteriores)
    if (rows.length > 0) {
      const sortedByDate = [...rows].sort(
        (a, b) => a.dataPagamento.getTime() - b.dataPagamento.getTime()
      );
      const lastDate = sortedByDate[sortedByDate.length - 1].dataPagamento;
      const toTs = lastDate.getTime();
      const fromLast7 = toTs - 7 * 24 * 3600 * 1000;
      const fromPrev7 = toTs - 14 * 24 * 3600 * 1000;

      const slice = (from: number, to: number) =>
        sortedByDate.filter((r) => r.dataPagamento.getTime() > from && r.dataPagamento.getTime() <= to);

      const last7 = slice(fromLast7, toTs);
      const prev7 = slice(fromPrev7, fromLast7);

      const sum = (arr: typeof rows, sel: (r: typeof rows[number]) => number) =>
        arr.reduce((acc, r) => acc + sel(r), 0);

      const tr = (arr: typeof rows) => {
        const l = sum(arr, (r) => r.liquidoLiberadoCent);
        const c = sum(arr, (r) => r.comissaoTotalCent);
        return l > 0 ? c / l : 0;
      };

      const takeRateLast = tr(last7);
      const takeRatePrev = tr(prev7);

      if (takeRatePrev > 0 && takeRateLast < takeRatePrev * 0.9) {
        alerts.push({
          type: "takeRateDown",
          title: "Comissão média caindo",
          severity: "warning",
          detail: `Comissão média dos últimos 7 dias ${formatPercent(takeRateLast)} vs ${formatPercent(
            takeRatePrev
          )} na semana anterior.`,
          generatedAt: new Date(),
        });
      }

      // Comissão calculada subindo (% de calculada nos últimos 7 vs anteriores)
      const calcShare = (arr: typeof rows) =>
        arr.length > 0 ? arr.filter((r) => r.comissaoCalculada).length / arr.length : 0;
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
          detail: `Sem comissão: ${contratosSemComissao} (${formatPercent(pctSemComissao)}) | Líquido pendente ${formatPercent(
            sumLiquido > 0 ? sumLiquidoSemComissao / sumLiquido : 0
          )}`,
          generatedAt: new Date(),
        });
      }
    }

    // Concentração Top 5
    if (sumComissao > 0) {
      const sellersSorted = bySeller
        .map((b) => ({ vendedor: b.vendedor, comissao: b.comissao }))
        .sort((a, b) => b.comissao - a.comissao);
      const top5 = sellersSorted.slice(0, 5);
      const top5Sum = top5.reduce((acc, s) => acc + s.comissao, 0);
      // Adjust share using cents directly to avoid mismatch
      const sumComissaoReais = sumComissao / 100;
      const shareReal = sumComissaoReais > 0 ? top5Sum / sumComissaoReais : 0;
      if (shareReal >= 0.7) {
        alerts.push({
          type: "top5ConcentrationHigh",
          title: "Concentração alta no Top 5",
          severity: "info",
          detail: `${formatPercent(shareReal)} da comissão concentrada nos Top 5 vendedores.`,
          filters: { vendedorNome: top5.map((s) => s.vendedor) },
          generatedAt: new Date(),
        });
      }
    }

    return {
      cards: {
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
      },
      timeseries,
      byStage,
      bySeller,
      byTyper,
      byProduct,
      byOperationType,
      alerts,
    };
  }),

  getDrilldown: gestaoProcedure.input(DRILLDOWN_SCHEMA).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database indisponível" });
    const baseWhere = buildWhere(input);
    const flagClauses: any[] = [];
    if (input.somenteComissaoCalculada) flagClauses.push(eq(contratos.comissaoCalculada, true));
    if (input.somenteLiquidoFallback) flagClauses.push(eq(contratos.liquidoFallback, true));
    if (input.somenteInconsistenciaData) flagClauses.push(eq(contratos.inconsistenciaDataPagamento, true));
    if (input.somenteSemComissao) flagClauses.push(eq(contratos.comissaoTotalCent, 0));

    const whereClause =
      flagClauses.length > 0
        ? baseWhere
          ? and(baseWhere, ...flagClauses)
          : and(...flagClauses)
        : baseWhere;

    const sortDir = input.sortDir === "asc" ? "asc" : "desc";
    const takeRateExpr = sql<number>`CASE WHEN ${contratos.liquidoLiberadoCent} = 0 THEN 0 ELSE ${contratos.comissaoTotalCent} / ${contratos.liquidoLiberadoCent} END`;

    const sortExpr =
      input.sortBy === "comissao"
        ? sortDir === "asc"
          ? asc(contratos.comissaoTotalCent)
          : desc(contratos.comissaoTotalCent)
        : input.sortBy === "liquido"
          ? sortDir === "asc"
            ? asc(contratos.liquidoLiberadoCent)
            : desc(contratos.liquidoLiberadoCent)
          : input.sortBy === "takeRate"
            ? sortDir === "asc"
              ? asc(takeRateExpr)
              : desc(takeRateExpr)
            : sortDir === "asc"
              ? asc(contratos.dataPagamento)
              : desc(contratos.dataPagamento);

    let totalQuery = db.select({ total: count() }).from(contratos);
    if (whereClause) {
      totalQuery = totalQuery.where(whereClause);
    }
    const totalResult = await totalQuery;
    const total = totalResult[0]?.total ?? 0;

    const offset = (input.page - 1) * input.pageSize;

    let query = db.select({
      idContrato: contratos.idContrato,
      numeroContrato: contratos.numeroContrato,
      dataPagamento: contratos.dataPagamento,
      vendedorNome: contratos.vendedorNome,
      digitadorNome: contratos.digitadorNome,
      produto: contratos.produto,
      tipoOperacao: contratos.tipoOperacao,
      agenteId: contratos.agenteId,
      etapaPipeline: contratos.etapaPipeline,
      liquidoLiberadoCent: contratos.liquidoLiberadoCent,
      comissaoBaseCent: contratos.comissaoBaseCent,
      comissaoBonusCent: contratos.comissaoBonusCent,
      comissaoTotalCent: contratos.comissaoTotalCent,
      inconsistenciaDataPagamento: contratos.inconsistenciaDataPagamento,
      liquidoFallback: contratos.liquidoFallback,
      comissaoCalculada: contratos.comissaoCalculada,
    }).from(contratos);
    if (whereClause) {
      query = query.where(whereClause);
    }
    query = query.orderBy(sortExpr, desc(contratos.idContrato)).limit(input.pageSize).offset(offset);

    const paginated = await query;

    return {
      page: input.page,
      pageSize: input.pageSize,
      total,
      data: paginated.map((row) => {
        const liquido = centsToNumber(row.liquidoLiberadoCent);
        const comissaoTotal = centsToNumber(row.comissaoTotalCent);
        const takeRate = liquido > 0 ? comissaoTotal / liquido : 0;
        return {
          idContrato: row.idContrato,
          numeroContrato: row.numeroContrato,
          dataPagamento: row.dataPagamento,
          vendedorNome: row.vendedorNome,
          digitadorNome: row.digitadorNome,
          produto: row.produto,
          tipoOperacao: row.tipoOperacao,
          agenteId: row.agenteId,
          etapaPipeline: row.etapaPipeline,
          liquido,
          comissaoBase: centsToNumber(row.comissaoBaseCent),
          comissaoBonus: centsToNumber(row.comissaoBonusCent),
          comissaoTotal,
          takeRate,
          diasDesdePagamento: Math.floor(
            (Date.now() - row.dataPagamento.getTime()) / (1000 * 60 * 60 * 24)
          ),
          flags: {
            inconsistenciaDataPagamento: row.inconsistenciaDataPagamento,
            liquidoFallback: row.liquidoFallback,
            comissaoCalculada: row.comissaoCalculada,
            semComissao: row.comissaoTotalCent === 0,
          },
        };
      }),
    };
  }),

  exportCSV: gestaoProcedure.input(FILTERS_SCHEMA).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database indisponível" });
    const where = buildWhere(input);
    const data = await db.select().from(contratos).where(where);

    const header = [
      "numero_contrato",
      "data_pagamento",
      "vendedor_nome",
      "digitador_nome",
      "produto",
      "tipo_operacao",
      "agente_id",
      "etapa_pipeline",
      "liquido",
      "comissao_base",
      "comissao_bonus",
      "comissao_total",
      "inconsistencia_data_pagamento",
      "liquido_fallback",
      "comissao_calculada",
    ];

    const rows = data.map((row) =>
      [
        row.numeroContrato,
        row.dataPagamento.toISOString(),
        row.vendedorNome,
        row.digitadorNome,
        row.produto,
        row.tipoOperacao,
        row.agenteId,
        row.etapaPipeline,
        centsToNumber(row.liquidoLiberadoCent).toFixed(2),
        centsToNumber(row.comissaoBaseCent).toFixed(2),
        centsToNumber(row.comissaoBonusCent).toFixed(2),
        centsToNumber(row.comissaoTotalCent).toFixed(2),
        row.inconsistenciaDataPagamento,
        row.liquidoFallback,
        row.comissaoCalculada,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );

    const csv = [header.join(","), ...rows].join("\n");
    return { csv };
  }),

  getHealth: gestaoProcedure.input(FILTERS_SCHEMA.partial()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database indisponível" });

    const where = buildWhere({
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      etapaPipeline: input.etapaPipeline,
      vendedorNome: input.vendedorNome,
      produto: input.produto,
      tipoOperacao: input.tipoOperacao,
      agenteId: input.agenteId,
      digitadorNome: input.digitadorNome,
    });

    const all = await db.select().from(contratos).where(where);
    const total = all.length || 1;
    const pctComissaoCalculada = all.filter((r) => r.comissaoCalculada).length / total;
    const pctLiquidoFallback = all.filter((r) => r.liquidoFallback).length / total;
    const pctInconsistenciaData = all.filter((r) => r.inconsistenciaDataPagamento).length / total;

    const logs = await db
      .select()
      .from(gestaoSyncLogs)
      .orderBy(desc(gestaoSyncLogs.createdAt))
      .limit(5);

    const warnings = logs.map((l) => ({
      id: l.id,
      rangeInicio: l.rangeInicio,
      rangeFim: l.rangeFim,
      fetched: l.fetched,
      upserted: l.upserted,
      unchanged: l.unchanged,
      skipped: l.skipped,
      durationMs: l.durationMs,
      warnings: l.warnings,
      createdAt: l.createdAt,
    }));

    const lastSyncAt = logs[0]?.createdAt ?? null;

    return {
      totalRegistros: all.length,
      pctComissaoCalculada,
      pctLiquidoFallback,
      pctInconsistenciaData,
      lastSyncAt,
      logs: warnings,
    };
  }),

  setMetaComissao: gestaoProcedure
    .input(z.object({ mes: z.string().min(7).max(7), valor: z.number().nonnegative() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database indisponível" });

      const existing = await db.select().from(gestaoMetas).where(eq(gestaoMetas.mes, input.mes)).limit(1);
      const metaValorStr = input.valor.toString();

      if (existing.length > 0) {
        await db
          .update(gestaoMetas)
          .set({ metaValor: metaValorStr, updatedAt: new Date() })
          .where(eq(gestaoMetas.id, existing[0].id));
      } else {
        await db.insert(gestaoMetas).values({
          id: `gestao_${input.mes}`,
          mes: input.mes,
          metaValor: metaValorStr,
        });
      }

      return { success: true };
    }),

  syncRange: gestaoProcedure
    .input(z.object({ dateFrom: z.string().min(10), dateTo: z.string().min(10) }))
    .mutation(async ({ input }) => {
      const { dateFrom, dateTo } = input;
      const start = new Date(dateFrom);
      const end = new Date(dateTo);
      const needsSwap = start.getTime() > end.getTime();
      const effectiveStart = needsSwap ? dateTo : dateFrom;
      const effectiveEnd = needsSwap ? dateFrom : dateTo;

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Datas inválidas" });
      }

      const jobId = nanoid();
      const ranges = splitRangeByMonth(effectiveStart, effectiveEnd);
      const job: SyncJobStatus = {
        id: jobId,
        status: "pending",
        totalMonths: ranges.length,
        completedMonths: 0,
        perMonth: [],
        startedAt: new Date(),
      };
      syncJobs.set(jobId, job);

      // roda em background
      (async () => {
        const updateJob = (range: { mesInicio: string; mesFim: string }, metrics: any) => {
          const current = syncJobs.get(jobId);
          if (!current) return;
          current.perMonth.push({
            mesInicio: range.mesInicio,
            mesFim: range.mesFim,
            status: metrics.warnings ? "error" : "done",
            fetched: metrics.fetched ?? 0,
            upserted: metrics.upserted ?? 0,
            unchanged: metrics.unchanged ?? 0,
            skipped: metrics.skipped ?? 0,
            durationMs: metrics.durationMs ?? 0,
            warnings: metrics.warnings ?? null,
          });
          current.completedMonths = current.perMonth.length;
          current.status = current.completedMonths === current.totalMonths ? "done" : "running";
          if (current.status === "done") current.finishedAt = new Date();
          syncJobs.set(jobId, current);
        };

        syncJobs.set(jobId, { ...job, status: "running" });
        await syncContratosGestaoIntervalo(effectiveStart, effectiveEnd, 1000, updateJob);
        const finalJob = syncJobs.get(jobId);
        if (finalJob) {
          finalJob.status = "done";
          finalJob.finishedAt = new Date();
          syncJobs.set(jobId, finalJob);
        }
      })().catch((err) => {
        console.error("[GestaoSync] job error", err);
        const current = syncJobs.get(jobId);
        if (current) {
          current.status = "done";
          current.finishedAt = new Date();
          syncJobs.set(jobId, current);
        }
      });

      return { success: true, syncId: jobId };
    }),

  getSyncStatus: gestaoProcedure
    .input(z.object({ syncId: z.string().min(10) }))
    .query(async ({ input }) => {
      const job = syncJobs.get(input.syncId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sync não encontrada" });
      }
      return job;
    }),
});

export type GestaoRouter = typeof gestaoRouter;
