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
  calcularPipelinePorEstagio,
  VendedoraStats,
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
  sincronizarVendedorasDoZoho,
  alternarVisibilidadeVendedora,
  listarTodasVendedoras,
} from "./dbHelpers";
import {
  listarMetasDiariasDoMes,
  listarMetasSemanaisDoMes,
  obterMetasDiarias,
  obterMetasSemanais,
  atualizarMetaDiaria,
  atualizarMetaSemanal,
  gerarMetasDiarias,
  gerarMetasSemanais,
  calcularDiasUteisDoMes,
  calcularSemanasUteisDoMes,
} from "./metasService";
import { filtrarContratosProcessadosValidos, filtrarContratosZohoValidos } from "./contractUtils";

function getIntervaloDoMes(mes: string) {
  const [ano, mesNum] = mes.split("-").map(Number);
  const inicio = `${ano}-${String(mesNum).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mesNum, 0).getDate();
  const fim = `${ano}-${String(mesNum).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  return { inicio, fim };
}

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
      const diasUteis = calcularDiasUteisDoMes(mesAtual);
      const semanasPlanejadas = calcularSemanasUteisDoMes(mesAtual);

      // Busca contratos do Zoho ou usa mock
      let contratosZoho;
      if (shouldUseMockData()) {
        console.log("[dashboardRouter] Usando dados mock (Zoho não disponível)");
        contratosZoho = gerarContratosMock();
      } else {
        contratosZoho = filtrarContratosZohoValidos(await zohoService.buscarContratosMesAtual());
      }

      // Sincroniza vendedoras do Zoho para o banco
      await sincronizarVendedorasDoZoho(contratosZoho);

      // Processa contratos e aplica filtro de estágios válidos
      const contratosProcessados = processarContratos(contratosZoho);
      const contratosParaExibicao = filtrarContratosProcessadosValidos(contratosProcessados);

      // Busca metas do banco
      const metasVendedorDb = await listarMetasVendedorPorMes(mesAtual);
      const metaGlobalDb = await obterMetaGlobal(mesAtual);
      const metasDiariasMes = await listarMetasDiariasDoMes(mesAtual);
      const metasSemanaisMes = await listarMetasSemanaisDoMes(mesAtual);

      // Monta mapa de metas por vendedora
      const metasMap = new Map<string, number>();
      metasVendedorDb.forEach((m) => {
        metasMap.set(m.vendedoraId, parseFloat(m.metaValor));
      });

      // Mapa de metas operacionais (diárias/semanais) por vendedora
      const metasPlanejadasMap = new Map<string, { metaDiaria: number; metaSemanal: number }>();

      metasDiariasMes.forEach((m) => {
        const valor = parseFloat(m.metaValor);
        if (isNaN(valor)) return;
        const atual = metasPlanejadasMap.get(m.vendedoraId) || { metaDiaria: 0, metaSemanal: 0 };
        atual.metaDiaria += valor;
        metasPlanejadasMap.set(m.vendedoraId, atual);
      });

      metasSemanaisMes.forEach((m) => {
        const valor = parseFloat(m.metaValor);
        if (isNaN(valor)) return;
        const atual = metasPlanejadasMap.get(m.vendedoraId) || { metaDiaria: 0, metaSemanal: 0 };
        atual.metaSemanal += valor;
        metasPlanejadasMap.set(m.vendedoraId, atual);
      });

      // Agrega por vendedora
      let vendedoras: VendedoraStats[] = agregarPorVendedora(contratosParaExibicao, metasMap).map((v) => {
        const planejada = metasPlanejadasMap.get(v.id);
        const metaDiaria =
          planejada && planejada.metaDiaria > 0
            ? planejada.metaDiaria / Math.max(1, metasDiariasMes.filter((m) => m.vendedoraId === v.id).length || diasUteis || 1)
            : diasUteis > 0
              ? v.meta / diasUteis
              : 0;
        const metaSemanal =
          planejada && planejada.metaSemanal > 0
            ? planejada.metaSemanal / Math.max(1, metasSemanaisMes.filter((m) => m.vendedoraId === v.id).length || semanasPlanejadas || 1)
            : semanasPlanejadas > 0
              ? v.meta / semanasPlanejadas
              : 0;

        return {
          ...v,
          metaDiariaPlanejada: metaDiaria,
          metaSemanalPlanejada: metaSemanal,
          diasUteis,
          semanasPlanejadas,
        };
      });

      // Busca vendedoras visíveis do banco
      const vendedorasVisiveis = await listarVendedoras();
      const idsVisiveis = new Set(vendedorasVisiveis.map((v) => v.id));

      // Calcula meta global (com TODAS as vendedoras)
      const metaGlobalValor = metaGlobalDb ? parseFloat(metaGlobalDb.metaValor) : 0;
      const superMetaGlobalValor = metaGlobalDb ? parseFloat(metaGlobalDb.superMetaValor) : 0;
      const metaGlobal = calcularMetaGlobal(vendedoras, metaGlobalValor, superMetaGlobalValor, mesAtual);

      // Aplica acelerador global
      vendedoras = aplicarAceleradorGlobal(vendedoras, metaGlobal.acelerador);

      // Detecta badges
      vendedoras = vendedoras.map((v) => ({
        ...v,
        badges: detectarBadges(v),
      }));

      // FILTRA apenas vendedoras visíveis para exibição
      const vendedorasVisiveis2 = vendedoras.filter((v) => idsVisiveis.has(v.id));

      // Calcula ranking (apenas com visíveis)
      const ranking = calcularRanking(vendedorasVisiveis2);

      // Produtos e rentabilidade
      const produtosMap = new Map<string, { contratos: number; comissao: number }>();
      let totalComissao = 0;

      contratosParaExibicao.forEach((c) => {
        const atual = produtosMap.get(c.produto) || { contratos: 0, comissao: 0 };
        atual.contratos += 1;
        atual.comissao += c.baseComissionavel;
        produtosMap.set(c.produto, atual);
        totalComissao += c.baseComissionavel;
      });

      const produtos = Array.from(produtosMap.entries())
        .map(([nome, dados]) => ({
          nome,
          totalContratos: dados.contratos,
          totalComissao: dados.comissao,
          comissaoMedia: dados.contratos > 0 ? dados.comissao / dados.contratos : 0,
          percentualTotal: totalComissao > 0 ? (dados.comissao / totalComissao) * 100 : 0,
        }))
        .sort((a, b) => b.totalComissao - a.totalComissao);

      // Pipeline
      const pipelineBruto = calcularPipelinePorEstagio(contratosParaExibicao);
      const pipeline = pipelineBruto.map((p) => ({
        estagio: p.estagio,
        totalValor: p.valorLiquido,
        totalContratos: p.quantidade,
      }));
      const totalValorPipeline = pipeline.reduce((acc, item) => acc + item.totalValor, 0);
      const pipelineComPercentual = pipeline.map((p) => ({
        ...p,
        percentualPipeline: totalValorPipeline > 0 ? (p.totalValor / totalValorPipeline) * 100 : 0,
      }));
      const valorEmLiberacao = contratosParaExibicao
        .filter((c) => c.valorComissaoOpta === 0 && c.valorLiquido > 0)
        .reduce((acc, c) => acc + c.valorLiquido, 0);

      return {
        mes: mesAtual,
        metaGlobal,
        vendedoras: vendedorasVisiveis2, // Retorna apenas visíveis
        ranking,
        totalContratos: contratosParaExibicao.length,
        ultimaAtualizacao: new Date().toISOString(),
        produtos,
        totalComissao,
        pipeline: pipelineComPercentual,
        totalValorPipeline,
        valorEmLiberacao,
        operacional: {
          diasUteis,
          semanasPlanejadas,
        },
      };
    } catch (error) {
      console.error("[dashboardRouter] Erro ao obter dashboard:", error);
      throw new Error("Falha ao carregar dados do dashboard");
    }
  }),

  /**
   * Endpoints de análise (produtos e pipeline) com filtros
   */
  obterAnalises: publicProcedure
    .input(
      z
        .object({
          mes: z.string().optional(),
          vendedoraId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const mes = input?.mes || obterMesAtual();
      const { inicio, fim } = getIntervaloDoMes(mes);

      let contratosZoho;
      if (shouldUseMockData()) {
        contratosZoho = gerarContratosMock();
      } else {
        contratosZoho = filtrarContratosZohoValidos(
          await zohoService.buscarContratos({ mesInicio: inicio, mesFim: fim })
        );
      }

      let contratosProcessados = filtrarContratosProcessadosValidos(processarContratos(contratosZoho));

      if (input?.vendedoraId) {
        contratosProcessados = contratosProcessados.filter(
          (c) => c.vendedoraId === input.vendedoraId
        );
      }

      const produtosMap = new Map<string, { contratos: number; comissao: number }>();
      let totalComissao = 0;

      contratosProcessados.forEach((c) => {
        const atual = produtosMap.get(c.produto) || { contratos: 0, comissao: 0 };
        atual.contratos += 1;
        atual.comissao += c.baseComissionavel;
        produtosMap.set(c.produto, atual);
        totalComissao += c.baseComissionavel;
      });

      const produtos = Array.from(produtosMap.entries())
        .map(([nome, dados]) => ({
          nome,
          totalContratos: dados.contratos,
          totalComissao: dados.comissao,
          comissaoMedia: dados.contratos > 0 ? dados.comissao / dados.contratos : 0,
          percentualTotal: totalComissao > 0 ? (dados.comissao / totalComissao) * 100 : 0,
        }))
        .sort((a, b) => b.totalComissao - a.totalComissao);

      const pipelineBruto = calcularPipelinePorEstagio(contratosProcessados);
      const pipeline = pipelineBruto.map((p) => ({
        estagio: p.estagio,
        totalValor: p.valorLiquido,
        totalContratos: p.quantidade,
      }));
      const totalValorPipeline = pipeline.reduce((acc, item) => acc + item.totalValor, 0);
      const pipelineComPercentual = pipeline.map((p) => ({
        ...p,
        percentualPipeline: totalValorPipeline > 0 ? (p.totalValor / totalValorPipeline) * 100 : 0,
      }));

      return {
        mes,
        produtos,
        totalComissao,
        pipeline: pipelineComPercentual,
        totalValorPipeline,
      };
    }),

  /**
   * Obtém dados de uma vendedora específica
   */
  obterVendedora: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const mesAtual = obterMesAtual();
        const diasUteis = calcularDiasUteisDoMes(mesAtual);
        const semanasPlanejadas = calcularSemanasUteisDoMes(mesAtual);

      let contratosZoho;
      if (shouldUseMockData()) {
        contratosZoho = gerarContratosMock();
      } else {
        contratosZoho = filtrarContratosZohoValidos(await zohoService.buscarContratosMesAtual());
      }
        const contratosProcessados = filtrarContratosProcessadosValidos(processarContratos(contratosZoho));

        const metasDiarias = await obterMetasDiarias(mesAtual, input.id);
        const metasSemanais = await obterMetasSemanais(mesAtual, input.id);

        const metasVendedorDb = await listarMetasVendedorPorMes(mesAtual);
        const metaGlobalDb = await obterMetaGlobal(mesAtual);

        const metasMap = new Map<string, number>();
        metasVendedorDb.forEach((m) => {
          metasMap.set(m.vendedoraId, parseFloat(m.metaValor));
        });

        const vendedoras = agregarPorVendedora(contratosProcessados, metasMap);
        const metaGlobalValor = metaGlobalDb ? parseFloat(metaGlobalDb.metaValor) : 0;
        const superMetaGlobalValor = metaGlobalDb ? parseFloat(metaGlobalDb.superMetaValor) : 0;
        const metaGlobal = calcularMetaGlobal(vendedoras, metaGlobalValor, superMetaGlobalValor, mesAtual);

        const vendedora = vendedoras.find((v) => v.id === input.id);

        if (!vendedora) {
          throw new Error("Vendedora não encontrada");
        }

        // Aplica acelerador global
        const vendedorasComAcelerador = aplicarAceleradorGlobal([vendedora], metaGlobal.acelerador);
        const vendedoraFinal = vendedorasComAcelerador[0];
        vendedoraFinal.badges = detectarBadges(vendedoraFinal);
        const metaDiariaPlanejada =
          metasDiarias.length > 0
            ? metasDiarias.reduce((acc, m) => acc + parseFloat(m.metaValor), 0) /
              Math.max(1, metasDiarias.length)
            : diasUteis > 0
              ? vendedoraFinal.meta / diasUteis
              : 0;
        const metaSemanalPlanejada =
          metasSemanais.length > 0
            ? metasSemanais.reduce((acc, m) => acc + parseFloat(m.metaValor), 0) /
              Math.max(1, metasSemanais.length)
            : semanasPlanejadas > 0
              ? vendedoraFinal.meta / semanasPlanejadas
              : 0;

        vendedoraFinal.metaDiariaPlanejada = metaDiariaPlanejada;
        vendedoraFinal.metaSemanalPlanejada = metaSemanalPlanejada;
        vendedoraFinal.diasUteis = diasUteis;
        vendedoraFinal.semanasPlanejadas = semanasPlanejadas;

        return {
          vendedora: vendedoraFinal,
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
   * Lista todas as vendedoras cadastradas (apenas visíveis)
   */
  listarVendedoras: protectedProcedure.query(async () => {
    return listarVendedoras();
  }),

  /**
   * Lista TODAS as vendedoras (incluindo ocultas) para administração
   */
  listarTodasVendedoras: protectedProcedure.query(async () => {
    return listarTodasVendedoras();
  }),

  /**
   * Alterna visibilidade de uma vendedora no dashboard
   */
  alternarVisibilidade: protectedProcedure
    .input(
      z.object({
        vendedoraId: z.string(),
        visivel: z.enum(["sim", "nao"]),
      })
    )
    .mutation(async ({ input }) => {
      await alternarVisibilidadeVendedora(input.vendedoraId, input.visivel);
      return { success: true };
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
        metaValor: z.string().optional(),
        superMetaValor: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existente = await obterMetaGlobal(input.mes);
      const metaValor = input.metaValor ?? existente?.metaValor ?? "0";
      const superMetaValor = input.superMetaValor ?? existente?.superMetaValor ?? "0";
      const id = `meta_glob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await criarOuAtualizarMetaGlobal(
        {
          id,
          mes: input.mes,
          metaValor,
          superMetaValor,
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

  /**
   * Metas operacionais (diárias e semanais) para edição no admin
   */
  obterMetasOperacionais: protectedProcedure
    .input(z.object({ mes: z.string(), vendedoraId: z.string() }))
    .query(async ({ input }) => {
      const [diarias, semanais] = await Promise.all([
        obterMetasDiarias(input.mes, input.vendedoraId),
        obterMetasSemanais(input.mes, input.vendedoraId),
      ]);

      return {
        diarias,
        semanais,
        diasUteis: calcularDiasUteisDoMes(input.mes),
        semanasPlanejadas: calcularSemanasUteisDoMes(input.mes),
      };
    }),

  atualizarMetaDiaria: protectedProcedure
    .input(
      z.object({
        mes: z.string(),
        dia: z.number().min(1).max(31),
        vendedoraId: z.string(),
        metaValor: z.number().positive(),
      })
    )
    .mutation(async ({ input }) => {
      await atualizarMetaDiaria(input.mes, input.dia, input.vendedoraId, input.metaValor);
      return { success: true };
    }),

  atualizarMetaSemanal: protectedProcedure
    .input(
      z.object({
        mes: z.string(),
        semana: z.number().min(1).max(5),
        vendedoraId: z.string(),
        metaValor: z.number().positive(),
      })
    )
    .mutation(async ({ input }) => {
      await atualizarMetaSemanal(input.mes, input.semana, input.vendedoraId, input.metaValor);
      return { success: true };
    }),

  regenerarMetasVendedora: protectedProcedure
    .input(
      z.object({
        mes: z.string(),
        vendedoraId: z.string(),
        metaValor: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const metasDoMes = await listarMetasVendedorPorMes(input.mes);
      const metaVendedora = metasDoMes.find((m) => m.vendedoraId === input.vendedoraId);
      const metaValor =
        input.metaValor ?? (metaVendedora ? parseFloat(metaVendedora.metaValor) : 0);

      await gerarMetasDiarias(input.mes, input.vendedoraId, metaValor);
      await gerarMetasSemanais(input.mes, input.vendedoraId, metaValor);
      return { success: true };
    }),
});
