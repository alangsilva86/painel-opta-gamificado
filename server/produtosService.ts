import { zohoService } from "./zohoService";
import { filtrarContratosZohoValidos } from "./contractUtils";

export interface ProdutoStats {
  nome: string;
  totalContratos: number;
  totalComissao: number;
  comissaoMedia: number;
  percentualTotal: number;
}

export interface PipelineStats {
  estagio: string;
  totalContratos: number;
  totalValor: number;
  percentualPipeline: number;
}

function getIntervaloMes(mes: string) {
  const [ano, mesNum] = mes.split("-").map(Number);
  const inicio = `${ano}-${String(mesNum).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mesNum, 0).getDate();
  const fim = `${ano}-${String(mesNum).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  return { inicio, fim };
}

/**
 * Agrupa contratos por produto e calcula estatísticas
 */
export async function analisarProdutos(mes: string) {
  const { inicio, fim } = getIntervaloMes(mes);
  const contratos = filtrarContratosZohoValidos(
    await zohoService.buscarContratos({
      mesInicio: inicio,
      mesFim: fim,
    })
  );

  const produtosMap = new Map<string, { contratos: number; comissao: number }>();
  let totalComissaoGeral = 0;

  for (const contrato of contratos) {
    const produtoNome = contrato.Produto?.display_value || "Sem produto";
    const comissao = contrato.Base_comissionavel_vendedores || 0;

    const atual = produtosMap.get(produtoNome) || { contratos: 0, comissao: 0 };
    atual.contratos++;
    atual.comissao += comissao;
    produtosMap.set(produtoNome, atual);

    totalComissaoGeral += comissao;
  }

  // Converter para array e calcular percentuais
  const produtos: ProdutoStats[] = Array.from(produtosMap.entries())
    .map(([nome, dados]) => ({
      nome,
      totalContratos: dados.contratos,
      totalComissao: dados.comissao,
      comissaoMedia: dados.contratos > 0 ? dados.comissao / dados.contratos : 0,
      percentualTotal: totalComissaoGeral > 0 ? (dados.comissao / totalComissaoGeral) * 100 : 0,
    }))
    .sort((a, b) => b.totalComissao - a.totalComissao);

  return {
    produtos,
    totalComissao: totalComissaoGeral,
    totalContratos: contratos.length,
  };
}

/**
 * Agrupa contratos por estágio do pipeline
 */
export async function analisarPipeline(mes: string) {
  const { inicio, fim } = getIntervaloMes(mes);
  const contratos = filtrarContratosZohoValidos(
    await zohoService.buscarContratos({
      mesInicio: inicio,
      mesFim: fim,
    })
  );

  const pipelineMap = new Map<string, { contratos: number; valor: number }>();
  let totalValorPipeline = 0;

  for (const contrato of contratos) {
    const estagio = contrato.Estagio?.display_value || "Sem estágio";
    const valor = contrato.Valor_liquido_liberado || 0;

    const atual = pipelineMap.get(estagio) || { contratos: 0, valor: 0 };
    atual.contratos++;
    atual.valor += valor;
    pipelineMap.set(estagio, atual);

    totalValorPipeline += valor;
  }

  // Converter para array e calcular percentuais
  const pipeline: PipelineStats[] = Array.from(pipelineMap.entries())
    .map(([estagio, dados]) => ({
      estagio,
      totalContratos: dados.contratos,
      totalValor: dados.valor,
      percentualPipeline: totalValorPipeline > 0 ? (dados.valor / totalValorPipeline) * 100 : 0,
    }))
    .sort((a, b) => b.totalValor - a.totalValor);

  return {
    pipeline,
    totalValor: totalValorPipeline,
    totalContratos: contratos.length,
  };
}

/**
 * Produtos mais vendidos (por quantidade de contratos)
 */
export async function obterProdutosMaisVendidos(mes: string, limite: number = 5) {
  const { produtos } = await analisarProdutos(mes);
  return produtos.slice(0, limite);
}

/**
 * Produtos mais rentáveis (por comissão total)
 */
export async function obterProdutosMaisRentaveis(mes: string, limite: number = 5) {
  const { produtos } = await analisarProdutos(mes);
  return produtos.slice(0, limite);
}

/**
 * Estágios do pipeline com mais valor
 */
export async function obterPipelineOrdenado(mes: string) {
  const { pipeline } = await analisarPipeline(mes);
  return pipeline;
}
