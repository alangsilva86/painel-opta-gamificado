import { createHash, timingSafeEqual } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  contratos,
  gestaoMetas,
  gestaoSyncLogs,
} from "../../drizzle/schema";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { nanoid } from "nanoid";
import {
  buildMergedRangesForIntervals,
  syncContratosGestaoRanges,
} from "./syncService";
import {
  buildGestaoResumoSnapshot,
  buildWhere,
  calcularComissaoVendedoraCent,
  centsToNumber,
  FILTERS_SCHEMA,
} from "./resumoSnapshot";
import {
  CHAT_ANALYST_INPUT_SCHEMA,
  generateGestaoAnalystResponse,
} from "./chatAnalyst";

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
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Acesso Gestão não autorizado",
    });
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
      const expected = Buffer.from(
        expectedHash,
        expectedHash.length === 64 ? "hex" : "utf8"
      );

      if (
        expected.length !== providedHash.length ||
        !timingSafeEqual(expected, providedHash)
      ) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Senha inválida",
        });
      }

      const cookieOptions = {
        ...getSessionCookieOptions(ctx.req),
        maxAge: 8 * 60 * 60 * 1000, // 8h
      };
      ctx.res.cookie("gestao_access", "1", cookieOptions);
      return { success: true };
    }),

  getResumo: gestaoProcedure.input(FILTERS_SCHEMA).query(async ({ input }) => {
    return buildGestaoResumoSnapshot(input);
  }),

  chatAnalyst: gestaoProcedure
    .input(CHAT_ANALYST_INPUT_SCHEMA)
    .mutation(async ({ input }) => {
      const snapshot = await buildGestaoResumoSnapshot({
        dateFrom: input.viewState.dateFrom,
        dateTo: input.viewState.dateTo,
        ...input.viewState.filterState,
      });

      const comparisonSnapshot =
        input.viewState.comparisonMode &&
        input.viewState.comparisonDateFrom &&
        input.viewState.comparisonDateTo
          ? await buildGestaoResumoSnapshot({
              dateFrom: input.viewState.comparisonDateFrom,
              dateTo: input.viewState.comparisonDateTo,
              ...input.viewState.filterState,
            })
          : null;

      try {
        return await generateGestaoAnalystResponse({
          input,
          snapshot,
          comparisonSnapshot,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[GestaoLog] Falha no agente analítico:", msg);

        const userMessage = (() => {
          if (msg.includes("OPENAI_API_KEY is not configured"))
            return "O analista de IA está indisponível: OPENAI_API_KEY não configurada no servidor.";
          if (msg.includes("LLM invoke failed: 401"))
            return "Chave de API inválida ou sem permissão (401). Verifique OPENAI_API_KEY.";
          if (msg.includes("LLM invoke failed: 400"))
            return "Endpoint ou modelo inválido (400). Verifique OPENAI_API_URL e OPENAI_MODEL.";
          if (msg.includes("LLM invoke failed: 404"))
            return "Endpoint não encontrado (404). Verifique OPENAI_API_URL.";
          if (msg.includes("LLM invoke failed: 429"))
            return "Limite de requisições da API atingido (429). Aguarde e tente novamente.";
          if (msg.includes("LLM invoke failed:"))
            return "O servidor de modelos retornou um erro inesperado. Consulte os logs do servidor.";
          if (msg.includes("LLM response parse failed"))
            return "O modelo retornou uma resposta incompleta. Tente uma pergunta mais curta.";
          if (msg.includes("LLM response schema mismatch"))
            return "O modelo retornou um formato inesperado. Reformule a pergunta e tente novamente.";
          return "O analista de IA não conseguiu responder agora. Tente novamente em instantes.";
        })();

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: userMessage,
        });
      }
    }),

  getDrilldown: gestaoProcedure
    .input(DRILLDOWN_SCHEMA)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database indisponível",
        });
      const baseWhere = buildWhere(input);
      const flagClauses: any[] = [];
      if (input.somenteComissaoCalculada)
        flagClauses.push(eq(contratos.comissaoCalculada, true));
      if (input.somenteLiquidoFallback)
        flagClauses.push(eq(contratos.liquidoFallback, true));
      if (input.somenteInconsistenciaData)
        flagClauses.push(eq(contratos.inconsistenciaDataPagamento, true));
      if (input.somenteSemComissao)
        flagClauses.push(eq(contratos.comissaoTotalCent, 0));

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

      const totalResult = await db
        .select({ total: count() })
        .from(contratos)
        .where(whereClause);
      const total = totalResult[0]?.total ?? 0;

      const offset = (input.page - 1) * input.pageSize;

      const query = db
        .select({
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
        })
        .from(contratos)
        .where(whereClause)
        .orderBy(sortExpr, desc(contratos.idContrato))
        .limit(input.pageSize)
        .offset(offset);

      const paginated = await query;

      return {
        page: input.page,
        pageSize: input.pageSize,
        total,
        data: paginated.map(row => {
          const liquido = centsToNumber(row.liquidoLiberadoCent);
          const comissaoTotal = centsToNumber(row.comissaoTotalCent);
          const comissaoVendedora = centsToNumber(
            calcularComissaoVendedoraCent(row)
          );
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
            comissaoVendedora,
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
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database indisponível",
      });
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
      "comissao_vendedora",
      "inconsistencia_data_pagamento",
      "liquido_fallback",
      "comissao_calculada",
    ];

    const rows = data.map(row =>
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
        centsToNumber(calcularComissaoVendedoraCent(row)).toFixed(2),
        row.inconsistenciaDataPagamento,
        row.liquidoFallback,
        row.comissaoCalculada,
      ]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );

    const csv = [header.join(","), ...rows].join("\n");
    return { csv };
  }),

  getHealth: gestaoProcedure
    .input(FILTERS_SCHEMA.partial())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database indisponível",
        });

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
      const pctComissaoCalculada =
        all.filter(r => r.comissaoCalculada).length / total;
      const pctLiquidoFallback =
        all.filter(r => r.liquidoFallback).length / total;
      const pctInconsistenciaData =
        all.filter(r => r.inconsistenciaDataPagamento).length / total;

      const logs = await db
        .select()
        .from(gestaoSyncLogs)
        .orderBy(desc(gestaoSyncLogs.createdAt))
        .limit(5);

      const warnings = logs.map(l => ({
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
    .input(
      z.object({
        mes: z.string().min(7).max(7),
        valor: z.number().nonnegative(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database indisponível",
        });

      const existing = await db
        .select()
        .from(gestaoMetas)
        .where(eq(gestaoMetas.mes, input.mes))
        .limit(1);
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
    .input(
      z.object({
        dateFrom: z.string().min(10),
        dateTo: z.string().min(10),
        additionalRanges: z
          .array(
            z.object({
              dateFrom: z.string().min(10),
              dateTo: z.string().min(10),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { dateFrom, dateTo } = input;
      const start = new Date(dateFrom);
      const end = new Date(dateTo);
      const needsSwap = start.getTime() > end.getTime();
      const effectiveStart = needsSwap ? dateTo : dateFrom;
      const effectiveEnd = needsSwap ? dateFrom : dateTo;

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Datas inválidas",
        });
      }

      const jobId = nanoid();
      const baseIntervals = [
        { dateFrom: effectiveStart, dateTo: effectiveEnd },
      ];
      const extraIntervals =
        input.additionalRanges?.map(
          ({ dateFrom: extraFrom, dateTo: extraTo }) => {
            const extraStart = new Date(extraFrom);
            const extraEnd = new Date(extraTo);
            if (
              Number.isNaN(extraStart.getTime()) ||
              Number.isNaN(extraEnd.getTime())
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Datas de comparação inválidas",
              });
            }
            return extraStart.getTime() <= extraEnd.getTime()
              ? { dateFrom: extraFrom, dateTo: extraTo }
              : { dateFrom: extraTo, dateTo: extraFrom };
          }
        ) ?? [];
      const ranges = buildMergedRangesForIntervals([
        ...baseIntervals,
        ...extraIntervals,
      ]);
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
        const updateJob = (
          range: { mesInicio: string; mesFim: string },
          metrics: any
        ) => {
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
          current.status =
            current.completedMonths === current.totalMonths
              ? "done"
              : "running";
          if (current.status === "done") current.finishedAt = new Date();
          syncJobs.set(jobId, current);
        };

        syncJobs.set(jobId, { ...job, status: "running" });
        await syncContratosGestaoRanges(ranges, 1000, updateJob);
        const finalJob = syncJobs.get(jobId);
        if (finalJob) {
          finalJob.status = "done";
          finalJob.finishedAt = new Date();
          syncJobs.set(jobId, finalJob);
        }
      })().catch(err => {
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sync não encontrada",
        });
      }
      return job;
    }),
});

export type GestaoRouter = typeof gestaoRouter;
