/**
 * Serviço de cálculos de comissão e tiers
 * Implementa as regras de negócio ATUALIZADAS do plano de comissionamento Opta
 * 
 * REGRA CRÍTICA: Base de comissão vem do campo Valor_comissao do Zoho,
 * NÃO do valor líquido (amount)
 */

import { ZohoContrato } from "./zohoService";

export interface ContratoProcessado {
  id: string;
  numero: string;
  dataPagamento: string;
  valorLiquido: number; // Valor do empréstimo (NÃO usado para comissão)
  valorComissaoOpta: number; // Comissão da Opta (NÃO EXIBIR)
  baseComissionavel: number; // Valor_comissao_opta * 0.55 * 0.06
  vendedora: string;
  vendedoraId: string;
  produto: string;
  produtoId: string;
  corban: string;
  estagio: string;
  estagioId: string;
  ignoradoPainelVendedoras?: boolean;
}

export interface VendedoraStats {
  id: string;
  nome: string;
  realizado: number; // Soma do valor líquido (volume de contratos pagos)
  baseComissionavelTotal: number; // Soma da base comissionável (o que vai para comissão)
  contratosSemComissao: number;
  contratosComComissao: number;
  meta: number;
  percentualMeta: number;
  tier: string;
  tierNumero: number;
  multiplicador: number;
  comissaoBase: number; // Sem acelerador
  comissaoPrevista: number; // Com acelerador
  aceleradorAplicado?: number;
  metaDiariaPlanejada?: number;
  metaSemanalPlanejada?: number;
  diasUteis?: number;
  semanasPlanejadas?: number;
  escada?: EscadaStep[];
  contratos: ContratoProcessado[];
  badges: string[];
  streak: number;
}

export interface MetaGlobalStats {
  mes: string;
  metaValor: number;
  superMetaValor: number;
  realizado: number;
  percentualMeta: number;
  percentualSuperMeta: number;
  acelerador: number; // 0, 0.25 ou 0.50
  metaGlobalBatida: boolean;
  superMetaGlobalBatida: boolean;
  faltaMeta: number;
  faltaSuperMeta: number;
  escada: EscadaStep[];
}

export interface EscadaStep {
  label: string;
  percentual: number;
  alvo: number;
  falta: number;
  atingido: boolean;
}

/**
 * Tabela de tiers ATUALIZADA - Dezembro 2025
 * 
 * REGRA CRÍTICA: Bronze (1-75%) NÃO recebe comissão, mesmo com acelerador global
 */
export const TIERS = [
  { min: 1, max: 74.99, multiplicador: 0.0, nome: "Bronze", emoji: "🥉", cor: "gray" },
  { min: 75, max: 99.99, multiplicador: 0.5, nome: "Prata", emoji: "🥈", cor: "silver" },
  { min: 100, max: 124.99, multiplicador: 1.0, nome: "Ouro", emoji: "🥇", cor: "gold" },
  { min: 125, max: 149.99, multiplicador: 1.5, nome: "Platina", emoji: "💎", cor: "blue" },
  { min: 150, max: 174.99, multiplicador: 2.0, nome: "Brilhante", emoji: "✨", cor: "cyan" },
  { min: 175, max: 199.99, multiplicador: 2.5, nome: "Diamante", emoji: "🔷", cor: "teal" },
  { min: 200, max: 249.99, multiplicador: 3.0, nome: "Mestre", emoji: "👑", cor: "orange" },
  { min: 250, max: Infinity, multiplicador: 3.5, nome: "Lendário", emoji: "⚡", cor: "purple" },
];

export const ESCADA_NIVEIS = [75, 100, 125, 150, 175, 200, 250];
// Produtos que não contam para comissão nem para produção no painel das vendedoras
const PRODUTOS_SEM_COMISSAO_VENDEDORAS = new Set(["emprestimo garantia veiculo"]);

function normalizarTextoBasico(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function isProdutoSemComissaoParaVendedoras(produto: string) {
  return PRODUTOS_SEM_COMISSAO_VENDEDORAS.has(normalizarTextoBasico(produto));
}

export function isProdutoIgnoradoNoPainelVendedoras(produto: string) {
  return isProdutoSemComissaoParaVendedoras(produto);
}

/**
 * Calcula a escada de evolução (próximos níveis)
 */
export function montarEscada(meta: number, realizado: number, labels?: Record<number, string>): EscadaStep[] {
  if (meta <= 0) {
    return ESCADA_NIVEIS.map((percentual) => ({
      percentual,
      label: labels?.[percentual] || `${percentual}%`,
      alvo: 0,
      falta: 0,
      atingido: false,
    }));
  }

  return ESCADA_NIVEIS.map((percentual) => {
    const alvo = meta * (percentual / 100);
    const falta = Math.max(0, alvo - realizado);
    return {
      percentual,
      label: labels?.[percentual] || `${percentual}%`,
      alvo,
      falta,
      atingido: falta === 0,
    };
  });
}

/**
 * Processa contratos do Zoho para formato interno
 * NOVA REGRA: Usa Base_comissionavel_vendedores já calculado no zohoService
 */
export function processarContratos(contratosZoho: ZohoContrato[]): ContratoProcessado[] {
  return contratosZoho.map((c) => {
    const produtoNome = c.Produto.display_value;
    const ignoradoPainelVendedoras = isProdutoIgnoradoNoPainelVendedoras(produtoNome);
    const baseComissionavel = ignoradoPainelVendedoras
      ? 0 // Produto não gera comissão/produção para vendedoras
      : c.Base_comissionavel_vendedores;

    return {
      id: c.ID,
      numero: c.Numero_do_Contrato,
      dataPagamento: c.Data_de_Pagamento,
      valorLiquido: c.Valor_liquido_liberado,
      valorComissaoOpta: c.Valor_comissao_opta, // NÃO EXIBIR
      baseComissionavel, // Já vem calculado, exceto para produtos sem comissão de vendedoras
      vendedora: c.Vendedor.display_value,
      vendedoraId: c.Vendedor.ID,
      produto: produtoNome,
      produtoId: c.Produto.ID,
      corban: c.Corban.display_value,
      estagio: c.Estagio.display_value,
      estagioId: c.Estagio.ID,
      ignoradoPainelVendedoras,
    };
  });
}

/**
 * Determina o tier baseado no percentual da meta
 */
export function determinarTier(percentualMeta: number): (typeof TIERS)[0] {
  const tier = TIERS.find((t) => percentualMeta >= t.min && percentualMeta <= t.max);
  return tier || TIERS[0]; // Default: Bronze
}

/**
 * Agrega contratos por vendedora
 */
export function agregarPorVendedora(
  contratos: ContratoProcessado[],
  metasMap: Map<string, number>
): VendedoraStats[] {
  const vendedorasMap = new Map<string, VendedoraStats>();

  contratos.forEach((contrato) => {
    const { vendedoraId, vendedora } = contrato;

    if (!vendedorasMap.has(vendedoraId)) {
      vendedorasMap.set(vendedoraId, {
        id: vendedoraId,
        nome: vendedora,
        realizado: 0,
        baseComissionavelTotal: 0,
        contratosSemComissao: 0,
        contratosComComissao: 0,
        meta: metasMap.get(vendedoraId) || 0,
        percentualMeta: 0,
        tier: "Bronze",
        tierNumero: 0,
        multiplicador: 0,
        comissaoBase: 0,
        comissaoPrevista: 0,
        aceleradorAplicado: 0,
        contratos: [],
        badges: [],
        streak: 0,
      });
    }

    const stats = vendedorasMap.get(vendedoraId)!;
    const ignoradoPainelVendedoras =
      contrato.ignoradoPainelVendedoras ?? isProdutoIgnoradoNoPainelVendedoras(contrato.produto);

    if (ignoradoPainelVendedoras) {
      return;
    }
    // Realizado = volume (valor líquido) dos contratos pagos
    stats.realizado += contrato.valorLiquido;
    // Base comissionável separada para cálculos de comissão
    stats.baseComissionavelTotal += contrato.baseComissionavel;
    if (contrato.baseComissionavel > 0) {
      stats.contratosComComissao += 1;
    } else {
      stats.contratosSemComissao += 1;
    }
    stats.contratos.push(contrato);
  });

  // Calcula percentuais e tiers
  const vendedoras = Array.from(vendedorasMap.values());
  vendedoras.forEach((v) => {
    v.percentualMeta = v.meta > 0 ? (v.realizado / v.meta) * 100 : 0;
    const tier = determinarTier(v.percentualMeta);
    v.tier = tier.nome;
    v.tierNumero = TIERS.indexOf(tier);
    v.multiplicador = tier.multiplicador;

    // Comissão base (sem acelerador) usa a base comissionável (não o volume)
    v.comissaoBase = v.baseComissionavelTotal * v.multiplicador;

    // Escada de progressão (para tooltips de próximo nível)
    v.escada = montarEscada(v.meta, v.realizado);
  });

  return vendedoras;
}

/**
 * Calcula meta global ATUALIZADA
 * Agora suporta Meta Global e Super Meta Global separadas
 */
export function calcularMetaGlobal(
  vendedoras: VendedoraStats[],
  metaGlobalValor: number,
  superMetaGlobalValor: number,
  mes: string
): MetaGlobalStats {
  const realizado = vendedoras.reduce((sum, v) => sum + v.realizado, 0);
  
  const percentualMeta = metaGlobalValor > 0 ? (realizado / metaGlobalValor) * 100 : 0;
  const percentualSuperMeta = superMetaGlobalValor > 0 ? (realizado / superMetaGlobalValor) * 100 : 0;
  
  const metaGlobalBatida = percentualMeta >= 100;
  const superMetaGlobalBatida = percentualSuperMeta >= 100;

  // NOVA REGRA: Aceleradores NÃO cumulativos (super meta substitui meta)
  let acelerador = 0;
  if (superMetaGlobalBatida) {
    acelerador = 0.5;
  } else if (metaGlobalBatida) {
    acelerador = 0.25;
  }

  const escadaLabels: Record<number, string> = {
    75: "75% (ativação)",
    100: "Meta Global",
  };

  const escada = montarEscada(metaGlobalValor, realizado, escadaLabels).filter(
    (step) => step.percentual <= 100
  );

  if (superMetaGlobalValor > 0) {
    escada.push({
      label: "Super Meta",
      percentual: (superMetaGlobalValor / (metaGlobalValor || 1)) * 100,
      alvo: superMetaGlobalValor,
      falta: Math.max(0, superMetaGlobalValor - realizado),
      atingido: superMetaGlobalBatida,
    });
  }

  return {
    mes,
    metaValor: metaGlobalValor,
    superMetaValor: superMetaGlobalValor,
    realizado,
    percentualMeta,
    percentualSuperMeta,
    acelerador,
    metaGlobalBatida,
    superMetaGlobalBatida,
    faltaMeta: Math.max(0, metaGlobalValor - realizado),
    faltaSuperMeta: Math.max(0, superMetaGlobalValor - realizado),
    escada,
  };
}

/**
 * Aplica acelerador global às vendedoras
 * NOVA REGRA: Apenas vendedoras com ≥75% da meta recebem acelerador
 */
export function aplicarAceleradorGlobal(
  vendedoras: VendedoraStats[],
  acelerador: number
): VendedoraStats[] {
  return vendedoras.map((v) => {
    // REGRA CRÍTICA: Bronze (< 75%) não recebe acelerador
    if (v.percentualMeta < 75) {
      v.comissaoPrevista = 0;
      v.aceleradorAplicado = 0;
    } else {
      v.comissaoPrevista = v.comissaoBase * (1 + acelerador);
      v.aceleradorAplicado = acelerador;
    }
    return v;
  });
}

/**
 * Detecta badges automáticas
 */
export function detectarBadges(vendedora: VendedoraStats): string[] {
  const badges: string[] = [];

  // Badges de meta
  if (vendedora.percentualMeta >= 100) badges.push("Meta 100%");
  if (vendedora.percentualMeta >= 150) badges.push("Supermeta 150%");
  if (vendedora.percentualMeta >= 200) badges.push("Supermeta 200%");

  // Badges de sequência (contratos no mesmo dia)
  const contratosPorDia = new Map<string, number>();
  vendedora.contratos.forEach((c) => {
    const dia = c.dataPagamento.split("T")[0];
    contratosPorDia.set(dia, (contratosPorDia.get(dia) || 0) + 1);
  });

  const maxContratosDia = Math.max(...Array.from(contratosPorDia.values()), 0);
  if (maxContratosDia >= 3) badges.push("Hat-trick");
  if (maxContratosDia >= 5) badges.push("Imparável");
  if (maxContratosDia >= 10) badges.push("Dominante");

  return badges;
}

/**
 * Calcula ranking das vendedoras
 */
export function calcularRanking(vendedoras: VendedoraStats[]): VendedoraStats[] {
  return [...vendedoras].sort((a, b) => {
    // 1º critério: % da meta (maior primeiro)
    if (b.percentualMeta !== a.percentualMeta) {
      return b.percentualMeta - a.percentualMeta;
    }
    // 2º critério: Valor realizado (maior primeiro)
    if (b.realizado !== a.realizado) {
      return b.realizado - a.realizado;
    }
    // 3º critério: Número de contratos (maior primeiro)
    return b.contratos.length - a.contratos.length;
  });
}

/**
 * Calcula produtos mais vendidos
 */
export function calcularProdutosMaisVendidos(
  contratos: ContratoProcessado[]
): Array<{ produto: string; quantidade: number }> {
  const produtosMap = new Map<string, number>();

  contratos.forEach((c) => {
    if (c.ignoradoPainelVendedoras) {
      return;
    }
    produtosMap.set(c.produto, (produtosMap.get(c.produto) || 0) + 1);
  });

  return Array.from(produtosMap.entries())
    .map(([produto, quantidade]) => ({ produto, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

/**
 * Calcula produtos mais rentáveis por vendedora
 */
export function calcularProdutosRentaveis(
  contratos: ContratoProcessado[]
): Array<{ produto: string; comissaoTotal: number }> {
  const produtosMap = new Map<string, number>();

  contratos.forEach((c) => {
    if (c.ignoradoPainelVendedoras) {
      return;
    }
    produtosMap.set(c.produto, (produtosMap.get(c.produto) || 0) + c.baseComissionavel);
  });

  return Array.from(produtosMap.entries())
    .map(([produto, comissaoTotal]) => ({ produto, comissaoTotal }))
    .sort((a, b) => b.comissaoTotal - a.comissaoTotal);
}

/**
 * Calcula pipeline por estágio (contratos sem comissão ainda)
 */
export function calcularPipelinePorEstagio(
  contratos: ContratoProcessado[]
): Array<{ estagio: string; valorLiquido: number; quantidade: number }> {
  const estagiosMap = new Map<string, { valorLiquido: number; quantidade: number }>();

  contratos.forEach((c) => {
    if (c.ignoradoPainelVendedoras) {
      return;
    }
    // Passa a considerar todos os contratos para visibilidade de pipeline
    if (c.valorLiquido > 0) {
      const stats = estagiosMap.get(c.estagio) || { valorLiquido: 0, quantidade: 0 };
      stats.valorLiquido += c.valorLiquido;
      stats.quantidade += 1;
      estagiosMap.set(c.estagio, stats);
    }
  });

  return Array.from(estagiosMap.entries())
    .map(([estagio, stats]) => ({ estagio, ...stats }))
    .sort((a, b) => b.valorLiquido - a.valorLiquido);
}
