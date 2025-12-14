import { createHash, timingSafeEqual } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { contratos } from "../../drizzle/schema";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";

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

function buildWhere(filters: z.infer<typeof FILTERS_SCHEMA>) {
  const clauses: any[] = [];
  if (filters.dateFrom) clauses.push(gte(contratos.dataPagamento, new Date(filters.dateFrom)));
  if (filters.dateTo) clauses.push(lte(contratos.dataPagamento, new Date(filters.dateTo)));
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
    const takeRate = sumLiquido > 0 ? sumComissao / sumLiquido : 0;
    const ticketMedio = total > 0 ? sumLiquido / total : 0;
    const pctComissaoCalculada =
      total > 0 ? rows.filter((r) => r.comissaoCalculada).length / total : 0;

    const timeseriesMap = groupBy(rows, (r) => formatDateKey(r.dataPagamento));
    const timeseries = Array.from(timeseriesMap.entries())
      .map(([date, list]) => ({
        date,
        contratos: list.length,
        liquido: centsToNumber(list.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0)),
        comissao: centsToNumber(list.reduce((acc, r) => acc + r.comissaoTotalCent, 0)),
        takeRate:
          list.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0) > 0
            ? list.reduce((acc, r) => acc + r.comissaoTotalCent, 0) /
              list.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0)
            : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const byStage = Array.from(groupBy(rows, (r) => r.etapaPipeline).entries()).map(
      ([etapa, list]) => ({
        etapa,
        count: list.length,
        liquido: centsToNumber(list.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0)),
        comissao: centsToNumber(list.reduce((acc, r) => acc + r.comissaoTotalCent, 0)),
        takeRate:
          list.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0) > 0
            ? list.reduce((acc, r) => acc + r.comissaoTotalCent, 0) /
              list.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0)
            : 0,
      })
    );

    const bySeller = Array.from(groupBy(rows, (r) => r.vendedorNome).entries()).map(
      ([vendedor, list]) => {
        const liquido = list.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0);
        const comissao = list.reduce((acc, r) => acc + r.comissaoTotalCent, 0);
        return {
          vendedor,
          count: list.length,
          liquido: centsToNumber(liquido),
          comissao: centsToNumber(comissao),
          takeRate: liquido > 0 ? comissao / liquido : 0,
          pctTotal: sumComissao > 0 ? comissao / sumComissao : 0,
        };
      }
    );

    const byTyper = Array.from(groupBy(rows, (r) => r.digitadorNome).entries()).map(
      ([digitador, list]) => {
        const liquido = list.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0);
        const comissao = list.reduce((acc, r) => acc + r.comissaoTotalCent, 0);
        return {
          digitador,
          count: list.length,
          liquido: centsToNumber(liquido),
          comissao: centsToNumber(comissao),
          takeRate: liquido > 0 ? comissao / liquido : 0,
        };
      }
    );

    const byProduct = Array.from(groupBy(rows, (r) => r.produto).entries()).map(
      ([produto, list]) => {
        const liquido = list.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0);
        const comissao = list.reduce((acc, r) => acc + r.comissaoTotalCent, 0);
        return {
          produto,
          count: list.length,
          liquido: centsToNumber(liquido),
          comissao: centsToNumber(comissao),
          takeRate: liquido > 0 ? comissao / liquido : 0,
        };
      }
    );

    const byOperationType = Array.from(groupBy(rows, (r) => r.tipoOperacao).entries()).map(
      ([tipoOperacao, list]) => {
        const liquido = list.reduce((acc, r) => acc + r.liquidoLiberadoCent, 0);
        const comissao = list.reduce((acc, r) => acc + r.comissaoTotalCent, 0);
        return {
          tipoOperacao,
          count: list.length,
          liquido: centsToNumber(liquido),
          comissao: centsToNumber(comissao),
          takeRate: liquido > 0 ? comissao / liquido : 0,
        };
      }
    );

    return {
      cards: {
        contratos: total,
        liquido: centsToNumber(sumLiquido),
        comissao: centsToNumber(sumComissao),
        takeRate,
        ticketMedio: centsToNumber(ticketMedio),
        pctComissaoCalculada,
      },
      timeseries,
      byStage,
      bySeller,
      byTyper,
      byProduct,
      byOperationType,
    };
  }),

  getDrilldown: gestaoProcedure.input(DRILLDOWN_SCHEMA).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database indisponível" });
    const where = buildWhere(input);
    const offset = (input.page - 1) * input.pageSize;
    const data = await db
      .select()
      .from(contratos)
      .where(where)
      .orderBy(desc(contratos.dataPagamento))
      .limit(input.pageSize)
      .offset(offset);

    return {
      page: input.page,
      pageSize: input.pageSize,
      data: data.map((row) => ({
        idContrato: row.idContrato,
        numeroContrato: row.numeroContrato,
        dataPagamento: row.dataPagamento,
        vendedorNome: row.vendedorNome,
        digitadorNome: row.digitadorNome,
        produto: row.produto,
        tipoOperacao: row.tipoOperacao,
        agenteId: row.agenteId,
        etapaPipeline: row.etapaPipeline,
        liquido: centsToNumber(row.liquidoLiberadoCent),
        comissaoBase: centsToNumber(row.comissaoBaseCent),
        comissaoBonus: centsToNumber(row.comissaoBonusCent),
        comissaoTotal: centsToNumber(row.comissaoTotalCent),
        flags: {
          inconsistenciaDataPagamento: row.inconsistenciaDataPagamento,
          liquidoFallback: row.liquidoFallback,
          comissaoCalculada: row.comissaoCalculada,
        },
      })),
    };
  }),

  exportCSV: gestaoProcedure.input(FILTERS_SCHEMA).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database indisponível");
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
});

export type GestaoRouter = typeof gestaoRouter;
