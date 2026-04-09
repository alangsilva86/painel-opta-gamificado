import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { router } from "../_core/trpc";
import { gestaoProcedure } from "../gestao/access";
import {
  buildDrilldownTransacoes,
  buildResumoFinanceiro,
  buildSerieHistorica,
} from "./resumoFinanceiro";
import { splitRangeByMonth, syncProcfyRanges } from "./syncService";

const MONTH_SCHEMA = z.string().regex(/^\d{4}-\d{2}$/);

type FinanceiroSyncJobStatus = {
  id: string;
  status: "pending" | "running" | "done";
  totalMonths: number;
  completedMonths: number;
  perMonth: Array<{
    inicio: string;
    fim: string;
    status: "done" | "error";
    fetched: number;
    upserted: number;
    durationMs: number;
    error?: string | null;
  }>;
  startedAt: Date;
  finishedAt?: Date;
};

const syncJobs = new Map<string, FinanceiroSyncJobStatus>();

export const financeiroRouter = router({
  getResumoFinanceiro: gestaoProcedure
    .input(z.object({ mes: MONTH_SCHEMA }))
    .query(({ input }) => buildResumoFinanceiro(input.mes)),

  getSerieHistorica: gestaoProcedure
    .input(
      z.object({
        meses: z.number().int().min(1).max(24).default(6),
        mesReferencia: MONTH_SCHEMA.optional(),
      })
    )
    .query(({ input }) => buildSerieHistorica(input)),

  getDrilldownTransacoes: gestaoProcedure
    .input(
      z.object({
        mes: MONTH_SCHEMA,
        tipo: z.enum(["revenue", "expense", "all"]).default("all"),
        categoria: z.string().min(1).optional(),
        conta: z.string().min(1).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(200).default(20),
      })
    )
    .query(({ input }) => buildDrilldownTransacoes(input)),

  syncRange: gestaoProcedure
    .input(
      z.object({
        inicio: z.string().min(10),
        fim: z.string().min(10),
      })
    )
    .mutation(async ({ input }) => {
      const start = new Date(input.inicio);
      const end = new Date(input.fim);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Datas inválidas",
        });
      }

      const ranges = splitRangeByMonth(input.inicio, input.fim);
      const jobId = nanoid();
      const initialJob: FinanceiroSyncJobStatus = {
        id: jobId,
        status: "pending",
        totalMonths: ranges.length,
        completedMonths: 0,
        perMonth: [],
        startedAt: new Date(),
      };

      syncJobs.set(jobId, initialJob);

      void (async () => {
        syncJobs.set(jobId, { ...initialJob, status: "running" });

        await syncProcfyRanges(ranges, async (range, result) => {
          const current = syncJobs.get(jobId);
          if (!current) return;

          current.perMonth.push(
            result.ok
              ? {
                  inicio: range.inicio,
                  fim: range.fim,
                  status: "done",
                  fetched: result.metrics.fetched,
                  upserted: result.metrics.upserted,
                  durationMs: result.metrics.durationMs,
                }
              : {
                  inicio: range.inicio,
                  fim: range.fim,
                  status: "error",
                  fetched: 0,
                  upserted: 0,
                  durationMs: result.durationMs,
                  error: result.error,
                }
          );

          current.completedMonths = current.perMonth.length;
          current.status =
            current.completedMonths === current.totalMonths
              ? "done"
              : "running";
          if (current.status === "done") {
            current.finishedAt = new Date();
          }

          syncJobs.set(jobId, current);
        });

        const finalJob = syncJobs.get(jobId);
        if (finalJob) {
          finalJob.status = "done";
          finalJob.finishedAt = new Date();
          syncJobs.set(jobId, finalJob);
        }
      })().catch(error => {
        console.error("[FinanceiroSync] job error", error);
        const current = syncJobs.get(jobId);
        if (!current) return;
        current.status = "done";
        current.finishedAt = new Date();
        if (current.perMonth.length === 0) {
          current.perMonth.push({
            inicio: input.inicio,
            fim: input.fim,
            status: "error",
            fetched: 0,
            upserted: 0,
            durationMs: 0,
            error: error instanceof Error ? error.message : String(error),
          });
          current.completedMonths = 1;
          current.totalMonths = Math.max(current.totalMonths, 1);
        }
        syncJobs.set(jobId, current);
      });

      return {
        success: true,
        jobId,
      };
    }),

  getSyncStatus: gestaoProcedure
    .input(z.object({ jobId: z.string().min(10) }))
    .query(({ input }) => {
      const job = syncJobs.get(input.jobId);
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sync não encontrada",
        });
      }

      return job;
    }),
});

export type FinanceiroRouter = typeof financeiroRouter;
