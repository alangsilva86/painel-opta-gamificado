import { createHash } from "crypto";
import {
  resolveZohoCommissionBreakdown,
} from "@shared/commercialRules";
import {
  parseMoneyToCents as parseMoneyToCentsShared,
  parsePercentToFraction,
} from "@shared/zohoParsing";
import { InsertContrato, InsertZohoContratoSnapshot } from "../../drizzle/schema";
import { ZohoContratoRaw } from "../zohoService";

export interface NormalizacaoContratoResult {
  snapshot: InsertZohoContratoSnapshot;
  contrato: InsertContrato;
  warnings: string[];
}

export const parseMoneyToCents = parseMoneyToCentsShared;
export const parsePercent = parsePercentToFraction;

export function normalizeText(value: unknown, fallback: string = "Sem info"): string {
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/\s+/g, " ");
    return cleaned || fallback;
  }

  if (value && typeof value === "object") {
    const maybe = (value as any).zc_display_value || (value as any).name || (value as any).ID;
    if (typeof maybe === "string") {
      const cleaned = maybe.trim().replace(/\s+/g, " ");
      return cleaned || fallback;
    }
  }

  return fallback;
}

export function normalizeLookupId(value: unknown, fallback: string = ""): string {
  if (value && typeof value === "object") {
    const maybe = (value as any).ID;
    if (typeof maybe === "string") {
      const cleaned = maybe.trim();
      return cleaned || fallback;
    }
  }

  return fallback;
}

function parseZohoDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // dd/mm/yyyy
  const slashParts = trimmed.split("/");
  if (slashParts.length === 3) {
    const [dd, mm, yyyy] = slashParts.map((part) => Number.parseInt(part, 10));
    if (!Number.isNaN(dd) && !Number.isNaN(mm) && !Number.isNaN(yyyy)) {
      return new Date(Date.UTC(yyyy, mm - 1, dd));
    }
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function stableStringify(payload: unknown): string {
  if (payload === null || typeof payload !== "object") return JSON.stringify(payload);

  const sortObject = (obj: any): any => {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(sortObject);

    return Object.keys(obj)
      .sort()
      .reduce<Record<string, any>>((acc, key) => {
        acc[key] = sortObject(obj[key]);
        return acc;
      }, {});
  };

  return JSON.stringify(sortObject(payload));
}

export function hashContratoZoho(raw: ZohoContratoRaw): string {
  const relevant = {
    ID: raw.ID,
    contractNumber: raw.contractNumber,
    paymentDate: raw.paymentDate,
    Data_de_Pagamento: raw.Data_de_Pagamento,
    amount: raw.amount,
    Valor_liquido_liberado: raw.Valor_liquido_liberado,
    Valor_comissao: raw.Valor_comissao,
    Comissao: raw.Comissao,
    Comissao_Bonus: raw.Comissao_Bonus,
    amountComission: raw.amountComission,
    comissionPercent: raw.comissionPercent,
    comissionPercentBonus: raw.comissionPercentBonus,
    sellerName: normalizeText(raw.sellerName, ""),
    sellerId: normalizeLookupId(raw.sellerName),
    typerName: normalizeText(raw.typerName, ""),
    typerId: normalizeLookupId(raw.typerName),
    product: normalizeText(raw.product, ""),
    productId: normalizeLookupId(raw.product),
    operationType: normalizeText(raw.operationType, ""),
    operationTypeId: normalizeLookupId(raw.operationType),
    agentId: normalizeText(raw.agentId, ""),
    agentLookupId: normalizeLookupId(raw.agentId),
    blueprintStage: normalizeText(raw["Blueprint.Current_Stage"], ""),
  };

  return createHash("sha256").update(stableStringify(relevant)).digest("hex");
}

export function normalizeContratoZoho(raw: ZohoContratoRaw): NormalizacaoContratoResult | null {
  const warnings: string[] = [];

  const dataPagamento1 = parseZohoDate(raw.Data_de_Pagamento);
  const dataPagamento2 = parseZohoDate(raw.paymentDate);
  const dataPagamento = dataPagamento1 ?? dataPagamento2;

  if (!dataPagamento) {
    warnings.push("data_pagamento ausente ou inválida");
    return null;
  }

  const inconsistenciaDataPagamento = Boolean(
    dataPagamento1 && dataPagamento2 && dataPagamento1.getTime() !== dataPagamento2.getTime()
  );

  const commissionBreakdown = resolveZohoCommissionBreakdown({
    valorLiquido: raw.Valor_liquido_liberado,
    valorLiquidoFallback: raw.amount,
    amountComission: raw.amountComission,
    valorComissao: raw.Valor_comissao,
    comissao: raw.Comissao,
    comissaoBonus: raw.Comissao_Bonus,
    comissionPercent: raw.comissionPercent,
    comissionPercentBonus: raw.comissionPercentBonus,
  });

  const liquidoLiberadoCent = Math.round(
    commissionBreakdown.liquidoLiberado * 100
  );
  const liquidoFallback =
    liquidoLiberadoCent > 0 &&
    parseMoneyToCents(raw.Valor_liquido_liberado) === 0 &&
    parseMoneyToCents(raw.amount) > 0;

  const comissaoBaseCent = Math.round(commissionBreakdown.comissaoBase * 100);
  const comissaoBonusCent = Math.round(commissionBreakdown.comissaoBonus * 100);
  const comissaoTotalCent = Math.round(
    commissionBreakdown.comissaoTotal * 100
  );
  const pctComissaoBase = commissionBreakdown.pctComissaoBase;
  const pctComissaoBonus = commissionBreakdown.pctComissaoBonus;
  const comissaoCalculada = commissionBreakdown.comissaoCalculada;

  const snapshot: InsertZohoContratoSnapshot = {
    idContrato: raw.ID,
    payloadRaw: stableStringify(raw),
    sourceHash: hashContratoZoho(raw),
    fetchedAt: new Date(),
  };

  const contrato: InsertContrato = {
    idContrato: raw.ID,
    numeroContrato: normalizeText(raw.contractNumber, ""),
    dataPagamento,
    liquidoLiberadoCent,
    comissaoBaseCent,
    comissaoBonusCent,
    comissaoTotalCent,
    pctComissaoBase: pctComissaoBase.toString(),
    pctComissaoBonus: pctComissaoBonus.toString(),
    vendedorId: normalizeLookupId(raw.sellerName),
    vendedorNome: normalizeText(raw.sellerName),
    digitadorId: normalizeLookupId(raw.typerName),
    digitadorNome: normalizeText(raw.typerName),
    produtoId: normalizeLookupId(raw.product),
    produto: normalizeText(raw.product),
    tipoOperacaoId: normalizeLookupId(raw.operationType),
    tipoOperacao: normalizeText(raw.operationType),
    agenteLookupId: normalizeLookupId(raw.agentId),
    agenteId: normalizeText(raw.agentId),
    etapaPipeline: normalizeText(raw["Blueprint.Current_Stage"]),
    inconsistenciaDataPagamento,
    liquidoFallback,
    comissaoCalculada,
    updatedAt: new Date(),
  };

  if (comissaoBaseCent === 0 && comissaoBonusCent === 0) {
    warnings.push("comissao_total zerada");
  }
  if (liquidoLiberadoCent === 0) {
    warnings.push("liquido_liberado zerado");
  }

  return { snapshot, contrato, warnings };
}
