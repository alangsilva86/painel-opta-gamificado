/**
 * Serviço de cálculos de comissão e tiers
 * Implementa as regras de negócio do plano de comissionamento
 */

export interface ContratoProcessado {
  id: string;
  numero: string;
  dataPagamento: string;
  valorLiquido: number;
  valorComissao: number;
  vendedora: string;
  vendedoraId: string;
  produto: string;
  corban: string;
  baseComissionavel: number;
  comissaoVendedora: number;
}

export interface VendedoraStats {
  id: string;
  nome: string;
  realizado: number;
  meta: number;
  percentualMeta: number;
  tier: number;
  multiplicador: number;
  comissaoPrevista: number;
  contratos: ContratoProcessado[];
  badges: string[];
  streak: number;
}

export interface MetaGlobalStats {
  mes: string;
  metaValor: number;
  realizado: number;
  percentual: number;
  acelerador: number;
}

/**
 * Parâmetros do plano de comissionamento
 */
const PARAMETROS = {
  BASE_PCT: 0.55, // 55% do valor de comissão
  PCT_VENDEDORA: 0.06, // 6% da base comissionável
};

/**
 * Tabela de tiers e multiplicadores
 */
const TIERS = [
  { min: 0, max: 74.99, multiplicador: 0.0, nome: "Sem comissão" },
  { min: 75, max: 99.99, multiplicador: 0.5, nome: "Bronze" },
  { min: 100, max: 124.99, multiplicador: 1.0, nome: "Prata" },
  { min: 125, max: 149.99, multiplicador: 1.5, nome: "Ouro" },
  { min: 150, max: 174.99, multiplicador: 2.0, nome: "Platina" },
  { min: 175, max: 199.99, multiplicador: 2.5, nome: "Diamante" },
  { min: 200, max: 249.99, multiplicador: 3.0, nome: "Mestre" },
  { min: 250, max: Infinity, multiplicador: 3.5, nome: "Lendário" },
];

/**
 * Calcula a base comissionável de um contrato
 */
export function calcularBaseComissionavel(valorComissao: number): number {
  return Math.round(valorComissao * PARAMETROS.BASE_PCT * 100) / 100;
}

/**
 * Calcula a comissão da vendedora sobre um contrato
 */
export function calcularComissaoVendedora(baseComissionavel: number): number {
  return Math.round(baseComissionavel * PARAMETROS.PCT_VENDEDORA * 100) / 100;
}

/**
 * Determina o tier baseado no percentual da meta
 */
export function determinarTier(percentualMeta: number): {
  tier: number;
  multiplicador: number;
  nome: string;
} {
  const tierEncontrado = TIERS.find(
    (t) => percentualMeta >= t.min && percentualMeta <= t.max
  );

  return {
    tier: tierEncontrado?.multiplicador || 0,
    multiplicador: tierEncontrado?.multiplicador || 0,
    nome: tierEncontrado?.nome || "Desconhecido",
  };
}

/**
 * Calcula o acelerador global baseado no percentual da meta global
 */
export function calcularAceleradorGlobal(percentualMetaGlobal: number): number {
  if (percentualMetaGlobal >= 100) return 0.5;
  if (percentualMetaGlobal >= 75) return 0.25;
  return 0;
}

/**
 * Calcula a comissão final de uma vendedora
 * Fórmula: Comissão Base * (Multiplicador Individual + Acelerador Global)
 */
export function calcularComissaoFinal(
  comissaoBase: number,
  multiplicadorIndividual: number,
  aceleradorGlobal: number
): number {
  return Math.round(comissaoBase * (multiplicadorIndividual + aceleradorGlobal) * 100) / 100;
}

/**
 * Processa contratos brutos do Zoho e calcula valores
 */
export function processarContratos(
  contratosZoho: any[]
): ContratoProcessado[] {
  return contratosZoho.map((c) => {
    const valorComissao = parseFloat(c.Valor_comissao || 0);
    const baseComissionavel = calcularBaseComissionavel(valorComissao);
    const comissaoVendedora = calcularComissaoVendedora(baseComissionavel);

    return {
      id: c.ID,
      numero: c.Numero_do_Contrato || "",
      dataPagamento: c.Data_de_Pagamento || "",
      valorLiquido: parseFloat(c.Valor_liquido_liberado || 0),
      valorComissao,
      vendedora: c.Vendedor?.display_value || "Desconhecido",
      vendedoraId: c.Vendedor?.ID || "",
      produto: c.Produto?.display_value || "",
      corban: c.Corban?.display_value || "",
      baseComissionavel,
      comissaoVendedora,
    };
  });
}

/**
 * Agrega contratos por vendedora e calcula estatísticas
 */
export function agregarPorVendedora(
  contratos: ContratoProcessado[],
  metas: Map<string, number>
): VendedoraStats[] {
  const vendedorasMap = new Map<string, VendedoraStats>();

  contratos.forEach((contrato) => {
    const { vendedoraId, vendedora } = contrato;

    if (!vendedorasMap.has(vendedoraId)) {
      vendedorasMap.set(vendedoraId, {
        id: vendedoraId,
        nome: vendedora,
        realizado: 0,
        meta: metas.get(vendedoraId) || 0,
        percentualMeta: 0,
        tier: 0,
        multiplicador: 0,
        comissaoPrevista: 0,
        contratos: [],
        badges: [],
        streak: 0,
      });
    }

    const stats = vendedorasMap.get(vendedoraId)!;
    stats.realizado += contrato.valorLiquido;
    stats.contratos.push(contrato);
  });

  // Calcula percentuais e tiers
  vendedorasMap.forEach((stats) => {
    if (stats.meta > 0) {
      stats.percentualMeta = (stats.realizado / stats.meta) * 100;
    }

    const tierInfo = determinarTier(stats.percentualMeta);
    stats.tier = tierInfo.tier;
    stats.multiplicador = tierInfo.multiplicador;

    // Soma comissões base
    const comissaoBase = stats.contratos.reduce(
      (sum, c) => sum + c.comissaoVendedora,
      0
    );
    stats.comissaoPrevista = comissaoBase * stats.multiplicador;
  });

  return Array.from(vendedorasMap.values());
}

/**
 * Calcula estatísticas globais
 */
export function calcularMetaGlobal(
  vendedoras: VendedoraStats[],
  metaGlobalValor: number,
  mes: string
): MetaGlobalStats {
  const realizado = vendedoras.reduce((sum, v) => sum + v.realizado, 0);
  const percentual = metaGlobalValor > 0 ? (realizado / metaGlobalValor) * 100 : 0;
  const acelerador = calcularAceleradorGlobal(percentual);

  return {
    mes,
    metaValor: metaGlobalValor,
    realizado,
    percentual,
    acelerador,
  };
}

/**
 * Aplica acelerador global às comissões das vendedoras
 */
export function aplicarAceleradorGlobal(
  vendedoras: VendedoraStats[],
  aceleradorGlobal: number
): VendedoraStats[] {
  return vendedoras.map((v) => {
    const comissaoBase = v.contratos.reduce(
      (sum, c) => sum + c.comissaoVendedora,
      0
    );
    v.comissaoPrevista = calcularComissaoFinal(
      comissaoBase,
      v.multiplicador,
      aceleradorGlobal
    );
    return v;
  });
}

/**
 * Detecta badges conquistadas
 */
export function detectarBadges(vendedora: VendedoraStats): string[] {
  const badges: string[] = [];

  // Badge: Meta alcançada (100%)
  if (vendedora.percentualMeta >= 100) {
    badges.push("meta_100");
  }

  // Badge: Supermeta (150%)
  if (vendedora.percentualMeta >= 150) {
    badges.push("supermeta_150");
  }

  // Badge: Hat-trick (3+ contratos)
  if (vendedora.contratos.length >= 3) {
    badges.push("hat_trick");
  }

  // Badge: Imparável (5+ contratos)
  if (vendedora.contratos.length >= 5) {
    badges.push("imparavel");
  }

  // Badge: Tier Lendário
  if (vendedora.percentualMeta >= 250) {
    badges.push("lendario");
  }

  return badges;
}

/**
 * Calcula o ranking de vendedoras
 */
export function calcularRanking(
  vendedoras: VendedoraStats[]
): VendedoraStats[] {
  return [...vendedoras].sort((a, b) => {
    // Primeiro por % da meta
    if (b.percentualMeta !== a.percentualMeta) {
      return b.percentualMeta - a.percentualMeta;
    }
    // Depois por valor realizado
    return b.realizado - a.realizado;
  });
}

