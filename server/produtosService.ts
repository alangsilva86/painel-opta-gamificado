import {
  calcularAnalisePipeline,
  calcularAnaliseProdutos,
  filtrarContratosPainelVendedoras,
  processarContratos,
} from "./calculationService";
import { filtrarContratosProcessadosValidos, filtrarContratosZohoValidos } from "./contractUtils";
import { zohoService } from "./zohoService";

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
  const contratosZoho = filtrarContratosZohoValidos(
    await zohoService.buscarContratos({
      mesInicio: inicio,
      mesFim: fim,
    })
  );
  const contratosProcessados = filtrarContratosProcessadosValidos(processarContratos(contratosZoho));
  const contratosParaPainel = filtrarContratosPainelVendedoras(contratosProcessados);
  const { produtos, totalComissao, totalContratos } = calcularAnaliseProdutos(contratosParaPainel);

  return {
    produtos,
    totalComissao,
    totalContratos,
  };
}

/**
 * Agrupa contratos por estágio do pipeline
 */
export async function analisarPipeline(mes: string) {
  const { inicio, fim } = getIntervaloMes(mes);
  const contratosZoho = filtrarContratosZohoValidos(
    await zohoService.buscarContratos({
      mesInicio: inicio,
      mesFim: fim,
    })
  );
  const contratosProcessados = filtrarContratosProcessadosValidos(processarContratos(contratosZoho));
  const contratosParaPainel = filtrarContratosPainelVendedoras(contratosProcessados);
  const { pipeline, totalValor, totalContratos } = calcularAnalisePipeline(contratosParaPainel);

  return {
    pipeline,
    totalValor,
    totalContratos,
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
