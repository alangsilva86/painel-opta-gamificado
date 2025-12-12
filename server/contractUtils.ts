import { ZohoContrato } from "./zohoService";

// Estágios que não devem ser considerados para produção/realizado
export const ESTAGIOS_INVALIDOS = new Set([
  "Cancelado",
  "Não Contratado",
  "Comercial",
  "Em Digitação",
]);

export function contratoTemEstagioValido(estagio?: string): boolean {
  if (!estagio) return true;
  return !ESTAGIOS_INVALIDOS.has(estagio);
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
