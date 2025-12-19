import { ZohoContrato } from "./zohoService";

// Estágios que contam para comissão (contratos com pagamento efetuado)
const ESTAGIOS_VALIDOS = new Set([
  "financeiro",
  "aguardando comissao",
  "dossie",
  "comissao paga",
]);

function normalizarEstagio(estagio: string): string {
  return estagio
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function contratoTemEstagioValido(estagio?: string): boolean {
  if (!estagio) return true; // mantém contratos sem estágio explícito
  return ESTAGIOS_VALIDOS.has(normalizarEstagio(estagio));
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
