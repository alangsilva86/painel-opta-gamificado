import { contratoTemEstagioValidoNome } from "@shared/commercialRules";
import { ZohoContrato } from "./zohoService";

export function contratoTemEstagioValido(estagio?: string): boolean {
  return contratoTemEstagioValidoNome(estagio);
}

/**
 * Filtra contratos brutos do Zoho (antes de processar) removendo estágios inválidos.
 */
export function filtrarContratosZohoValidos(contratos: ZohoContrato[]): ZohoContrato[] {
  return contratos.filter((c) => contratoTemEstagioValido(c.Estagio?.display_value));
}

/**
 * Filtra contratos já processados (uso no dashboard) removendo estágios inválidos.
 */
export function filtrarContratosProcessadosValidos<T extends { estagio?: string }>(
  contratos: T[]
): T[] {
  return contratos.filter((c) => contratoTemEstagioValido(c.estagio));
}
