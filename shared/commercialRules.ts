import { TIERS } from "./tiers";
import {
  parseMoneyToNumber,
  parsePercentToFraction,
} from "./zohoParsing";

export const BASE_COMISSIONAVEL_PCT = 0.55;
export const PCT_VENDEDORA = 0.06;
export const COMISSAO_VENDEDORA_FACTOR =
  BASE_COMISSIONAVEL_PCT * PCT_VENDEDORA;

export const GLOBAL_ACCELERATOR_META = 0.25;
export const GLOBAL_ACCELERATOR_SUPER_META = 0.5;
export const GLOBAL_ACCELERATOR_ELIGIBILITY_PCT = 75;

const ESTAGIOS_VALIDOS = new Set([
  "financeiro",
  "aguardando comissao",
  "dossie",
  "comissao paga",
]);

const PRODUTOS_SEM_COMISSAO_VENDEDORAS = new Set([
  "emprestimo garantia veiculo",
]);
const PRODUTOS_SEM_COMISSAO_KEYWORDS = [
  "emprestimo garantia veiculo",
  "egv",
];

export type ZohoCommissionInput = {
  valorLiquido?: unknown;
  valorLiquidoFallback?: unknown;
  amountComission?: unknown;
  valorComissao?: unknown;
  comissao?: unknown;
  comissaoBonus?: unknown;
  comissionPercent?: unknown;
  comissionPercentBonus?: unknown;
};

export type ZohoCommissionBreakdown = {
  liquidoLiberado: number;
  comissaoBase: number;
  comissaoBonus: number;
  comissaoTotal: number;
  pctComissaoBase: number;
  pctComissaoBonus: number;
  comissaoCalculada: boolean;
};

function firstPositiveNumber(values: Array<unknown>): number {
  for (const value of values) {
    const parsed = parseMoneyToNumber(value);
    if (parsed > 0) return parsed;
  }
  return 0;
}

export function normalizeCommercialText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizePipelineStage(value: string): string {
  return normalizeCommercialText(value);
}

export function contratoTemEstagioValidoNome(estagio?: string): boolean {
  if (!estagio) return true;
  return ESTAGIOS_VALIDOS.has(normalizePipelineStage(estagio));
}

export function isProdutoIgnoradoNoPainelVendedoras(produto: string): boolean {
  const normalizado = normalizeCommercialText(produto);
  if (PRODUTOS_SEM_COMISSAO_VENDEDORAS.has(normalizado)) return true;
  return PRODUTOS_SEM_COMISSAO_KEYWORDS.some(keyword =>
    normalizado.includes(keyword)
  );
}

export function calcularBaseComissionavelVendedora(
  valorComissaoOpta: number
): number {
  return valorComissaoOpta * COMISSAO_VENDEDORA_FACTOR;
}

export function resolveZohoCommissionBreakdown(
  input: ZohoCommissionInput
): ZohoCommissionBreakdown {
  const liquidoLiberado = firstPositiveNumber([
    input.valorLiquido,
    input.valorLiquidoFallback,
  ]);
  const pctComissaoBase = parsePercentToFraction(input.comissionPercent);
  const pctComissaoBonus = parsePercentToFraction(input.comissionPercentBonus);

  let comissaoBase = firstPositiveNumber([
    input.amountComission,
    input.valorComissao,
    input.comissao,
  ]);
  let comissaoBonus = parseMoneyToNumber(input.comissaoBonus);
  let comissaoCalculada = false;

  if (comissaoBase === 0 && pctComissaoBase > 0 && liquidoLiberado > 0) {
    comissaoBase = liquidoLiberado * pctComissaoBase;
    comissaoCalculada = true;
  }

  if (comissaoBonus === 0 && pctComissaoBonus > 0 && liquidoLiberado > 0) {
    comissaoBonus = liquidoLiberado * pctComissaoBonus;
    comissaoCalculada = true;
  }

  return {
    liquidoLiberado,
    comissaoBase,
    comissaoBonus,
    comissaoTotal: comissaoBase + comissaoBonus,
    pctComissaoBase,
    pctComissaoBonus,
    comissaoCalculada,
  };
}

export function calcularAceleradorGlobal(params: {
  percentualMeta: number;
  percentualSuperMeta: number;
}) {
  if (params.percentualSuperMeta >= 100) return GLOBAL_ACCELERATOR_SUPER_META;
  if (params.percentualMeta >= 100) return GLOBAL_ACCELERATOR_META;
  return 0;
}

export function determinarTier(percentualMeta: number) {
  return TIERS.find(
    tier => percentualMeta >= tier.min && percentualMeta <= tier.max
  ) || TIERS[0];
}
