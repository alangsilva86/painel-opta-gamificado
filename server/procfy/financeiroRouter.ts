import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { router } from "../_core/trpc";
import { gestaoProcedure } from "../gestao/access";
import {
  FINANCEIRO_CHAT_ANALYST_INPUT_SCHEMA,
  generateFinanceiroAnalystResponse,
  resolveFinanceiroAnalystContext,
} from "../financeiro/chatAnalyst";
import {
  buildFinanceiroInvestigationPack,
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

  chatAnalyst: gestaoProcedure
    .input(FINANCEIRO_CHAT_ANALYST_INPUT_SCHEMA)
    .mutation(async ({ input }) => {
      const resolvedContext = resolveFinanceiroAnalystContext(input);
      const comparisonMes = resolvedContext.compareTo;

      const [resumo, serie, investigation, comparisonResumo, comparisonInvestigation] =
        await Promise.all([
          buildResumoFinanceiro(resolvedContext.resolvedPeriod),
          buildSerieHistorica({
            meses: 6,
            mesReferencia: resolvedContext.resolvedPeriod,
          }),
          buildFinanceiroInvestigationPack(resolvedContext.resolvedPeriod),
          comparisonMes ? buildResumoFinanceiro(comparisonMes) : Promise.resolve(null),
          comparisonMes
            ? buildFinanceiroInvestigationPack(comparisonMes)
            : Promise.resolve(null),
        ]);

      try {
        return await generateFinanceiroAnalystResponse({
          input,
          resolvedContext,
          resumo,
          serie,
          investigation,
          comparisonResumo,
          comparisonInvestigation,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[FinanceiroAnalyst] Falha no agente analítico:", msg);

        const userMessage = (() => {
          if (msg.includes("OPENAI_API_KEY") || msg.includes("not configured"))
            return "O analista de IA está indisponível: OPENAI_API_KEY não configurada.";
          if (msg.includes("LLM invoke failed: 401"))
            return "Chave de API inválida. Verifique a configuração de OPENAI_API_KEY.";
          if (msg.includes("LLM invoke failed: 429"))
            return "Limite de requisições atingido. Aguarde alguns instantes e tente novamente.";
          if (msg.includes("LLM invoke failed: 400"))
            return "Endpoint ou modelo inválido. Verifique OPENAI_API_URL e OPENAI_MODEL.";
          if (
            msg.includes("LLM response parse failed") ||
            msg.includes("LLM response schema mismatch")
          )
            return "O modelo retornou um formato inesperado. Reformule a pergunta.";
          return "O analista de IA não conseguiu responder agora. Tente novamente.";
        })();

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: userMessage });
      }
    }),

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
