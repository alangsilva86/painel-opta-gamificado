import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { zohoService } from "./zohoService";
import { gerarContratosMock, shouldUseMockData } from "./mockDataService";
import {
  processarContratos,
  agregarPorVendedora,
  calcularMetaGlobal,
  aplicarAceleradorGlobal,
  detectarBadges,
  calcularRanking,
} from "./calculationService";
import {
  listarMetasVendedorPorMes,
  obterMetaGlobal,
  obterMesAtual,
  criarOuAtualizarMetaVendedor,
  criarOuAtualizarMetaGlobal,
  listarVendedoras,
  criarVendedora,
  listarHistoricoMetas,
} from "./dbHelpers";

/**
 * Router do dashboard - dados em tempo real
 */
export const dashboardRouter = router({
  /**
   * Obtém dados completos do dashboard para o mês atual
   */
  obterDashboard: publicProcedure.query(async () => {
    try {
      const mesAtual = obterMesAtual();

      // Busca contratos do Zoho ou usa mock
      let contratosZoho;
      if (shouldUseMockData()) {
        console.log("[dashboardRouter] Usando dados mock (Zoho não disponível)");
        contratosZoho = gerarContratosMock();
      } else {
        contratosZoho = await zohoService.buscarContratosMesAtual();
      }

      // Processa contratos
      const contratosProcessados = processarContratos(contratosZoho);

      // Busca metas do banco
      const metasVendedorDb = await listarMetasVendedorPorMes(mesAtual);
      const metaGlobalDb = await obterMetaGlobal(mesAtual);

      // Monta mapa de metas por vendedora
      const metasMap = new Map<string, number>();
      metasVendedorDb.forEach((m) => {
        metasMap.set(m.vendedoraId, parseFloat(m.metaValor));
      });

      // Agrega por vendedora
      let vendedoras = agregarPorVendedora(contratosProcessados, metasMap);

      // Calcula meta global
      const metaGlobalValor = metaGlobalDb ? parseFloat(metaGlobalDb.metaValor) : 0;
      const metaGlobal = calcularMetaGlobal(vendedoras, metaGlobalValor, mesAtual);

      // Aplica acelerador global
      vendedoras = aplicarAceleradorGlobal(vendedoras, metaGlobal.acelerador);

      // Detecta badges
      vendedoras = vendedoras.map((v) => ({
        ...v,
        badges: detectarBadges(v),
      }));

      // Calcula ranking
      const ranking = calcularRanking(vendedoras);

      return {
        mes: mesAtual,
        metaGlobal,
        vendedoras,
        ranking,
        totalContratos: contratosProcessados.length,
        ultimaAtualizacao: new Date().toISOString(),
      };
    } catch (error) {
      console.error("[dashboardRouter] Erro ao obter dashboard:", error);
      throw new Error("Falha ao carregar dados do dashboard");
    }
  }),

  /**
   * Obtém dados de uma vendedora específica
   */
  obterVendedora: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const mesAtual = obterMesAtual();
        let contratosZoho;
        if (shouldUseMockData()) {
          contratosZoho = gerarContratosMock();
        } else {
          contratosZoho = await zohoService.buscarContratosMesAtual();
        }
        const contratosProcessados = processarContratos(contratosZoho);

        // Filtra contratos da vendedora
        const contratosVendedora = contratosProcessados.filter(
          (c) => c.vendedoraId === input.id
        );

        const metasVendedorDb = await listarMetasVendedorPorMes(mesAtual);
        const metaGlobalDb = await obterMetaGlobal(mesAtual);

        const metasMap = new Map<string, number>();
        metasVendedorDb.forEach((m) => {
          metasMap.set(m.vendedoraId, parseFloat(m.metaValor));
        });

        const vendedoras = agregarPorVendedora(contratosProcessados, metasMap);
        const metaGlobalValor = metaGlobalDb ? parseFloat(metaGlobalDb.metaValor) : 0;
        const metaGlobal = calcularMetaGlobal(vendedoras, metaGlobalValor, mesAtual);

        const vendedora = vendedoras.find((v) => v.id === input.id);

        if (!vendedora) {
          throw new Error("Vendedora não encontrada");
        }

        // Aplica acelerador
        const comissaoBase = vendedora.contratos.reduce(
          (sum, c) => sum + c.comissaoVendedora,
          0
        );
        vendedora.comissaoPrevista =
          comissaoBase * (vendedora.multiplicador + metaGlobal.acelerador);
        vendedora.badges = detectarBadges(vendedora);

        return {
          vendedora,
          metaGlobal,
        };
      } catch (error) {
        console.error("[dashboardRouter] Erro ao obter vendedora:", error);
        throw new Error("Falha ao carregar dados da vendedora");
      }
    }),
});

/**
 * Router de administração - configuração de metas
 */
export const adminRouter = router({
  /**
   * Lista todas as vendedoras cadastradas
   */
  listarVendedoras: protectedProcedure.query(async () => {
    return listarVendedoras();
  }),

  /**
   * Cria uma nova vendedora
   */
  criarVendedora: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        nome: z.string(),
        email: z.string().email().optional(),
        foto: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await criarVendedora({
        ...input,
        ativo: "sim",
      });
      return { success: true };
    }),

  /**
   * Obtém metas do mês
   */
  obterMetas: protectedProcedure
    .input(z.object({ mes: z.string() }))
    .query(async ({ input }) => {
      const metasVendedor = await listarMetasVendedorPorMes(input.mes);
      const metaGlobal = await obterMetaGlobal(input.mes);

      return {
        metasVendedor,
        metaGlobal,
      };
    }),

  /**
   * Define meta de uma vendedora
   */
  definirMetaVendedor: protectedProcedure
    .input(
      z.object({
        mes: z.string(),
        vendedoraId: z.string(),
        metaValor: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = `meta_vend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await criarOuAtualizarMetaVendedor(
        {
          id,
          mes: input.mes,
          vendedoraId: input.vendedoraId,
          metaValor: input.metaValor,
        },
        ctx.user.id
      );
      return { success: true };
    }),

  /**
   * Define meta global
   */
  definirMetaGlobal: protectedProcedure
    .input(
      z.object({
        mes: z.string(),
        metaValor: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = `meta_glob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await criarOuAtualizarMetaGlobal(
        {
          id,
          mes: input.mes,
          metaValor: input.metaValor,
        },
        ctx.user.id
      );
      return { success: true };
    }),

  /**
   * Obtém histórico de alterações de metas
   */
  obterHistorico: protectedProcedure
    .input(z.object({ mes: z.string() }))
    .query(async ({ input }) => {
      return listarHistoricoMetas(input.mes);
    }),
});

