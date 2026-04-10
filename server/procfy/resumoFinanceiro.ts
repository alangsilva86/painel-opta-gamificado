import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import { contratos, procfyTransactions } from "../../drizzle/schema";
import { getDb } from "../db";
import { assertProcfySchema } from "./procfyCompat";
import { procfyService } from "./procfyService";

const CASH_EXPENSE_TYPES = ["fixed_expense", "variable_expense"] as const;
const NON_TRANSFER_EXPENSE_TYPES = [
  "fixed_expense",
  "variable_expense",
  "payroll",
  "tax",
] as const;
const DRE_TYPES = [
  "revenue",
  "fixed_expense",
  "variable_expense",
  "payroll",
  "tax",
] as const;

type CashBreakdownType = (typeof DRE_TYPES)[number];
type DrilldownTipo = "revenue" | "expense" | "all";

type MonthRange = {
  mes: string;
  startDateTime: Date;
  endDateTime: Date;
  startDateOnly: string;
  endDateOnly: string;
};

type CompetenciaRow = {
  produto: string;
  vendedorNome: string;
  liquidoLiberadoCent: number;
  comissaoTotalCent: number;
};

type CaixaRow = {
  idProcfy: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  paid: boolean;
  paidAt: string | null;
  competencyDate: string | null;
  amountCents: number;
  transactionType: CashBreakdownType | "transfer";
  paymentMethod: string;
  categoryId: string;
  categoryName: string;
  bankAccountId: string;
  bankAccountName: string;
  contactId: string;
  contactName: string;
  documentNumber: string | null;
};

type CompetenciaBreakdownItem = {
  valorCent: number;
};

export type ResumoFinanceiro = {
  competencia: {
    mes: string;
    receitaBruta: number;
    comissaoOpta: number;
    quantidadeContratos: number;
    porProduto: Array<{ produto: string; valor: number; pct: number }>;
    porVendedor: Array<{ vendedor: string; valor: number; pct: number }>;
  };
  caixa: {
    totalReceitas: number;
    totalDespesas: number;
    totalFolha: number;
    totalImpostos: number;
    resultadoLiquido: number;
    porCategoria: Array<{
      categoria: string;
      tipo: CashBreakdownType;
      valor: number;
      pct: number;
    }>;
    saldosContas: Array<{
      conta: string;
      saldo: number;
    }>;
  };
  comparativo: {
    comissaoVsReceitaCaixa: number;
    gap: number;
  };
};

export type SerieHistoricaItem = {
  mes: string;
  competencia: number;
  receitas: number;
  despesas: number;
  resultado: number;
};

export type FinanceiroInvestigationPack = {
  totalCosts: number;
  typeBreakdown: Array<{
    tipo: CashBreakdownType;
    label: string;
    valor: number;
    pctOfCosts: number;
    pctOfRevenue: number;
  }>;
  topExpenseCategories: Array<{
    categoria: string;
    tipo: CashBreakdownType;
    valor: number;
    pctOfCosts: number;
    pctWithinType: number;
  }>;
  payrollBreakdown: Array<{
    categoria: string;
    valor: number;
    pctOfPayroll: number;
  }>;
  categoryBridge: Array<{
    label: string;
    valor: number;
    pctOfCosts: number;
  }>;
  topExpenseTransactions: Array<DrilldownTransacao>;
  topRevenueTransactions: Array<DrilldownTransacao>;
  accountRisk: Array<{
    conta: string;
    saldo: number;
    status: "negative" | "low" | "healthy";
  }>;
  availableFilters: {
    categorias: string[];
    contas: string[];
  };
};

export type DrilldownTransacao = {
  id: string;
  name: string;
  tipo: string;
  categoria: string;
  conta: string;
  contato: string;
  valor: number;
  pago: boolean;
  dataPagamento: string | null;
  dataCompetencia: string | null;
  metodoPagamento: string;
};

type DrilldownInput = {
  mes: string;
  tipo?: DrilldownTipo;
  categoria?: string;
  conta?: string;
  page: number;
  pageSize: number;
};

function parseMonth(mes: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!match) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Mês inválido. Use YYYY-MM.",
    });
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Mês inválido. Use YYYY-MM.",
    });
  }

  return { year, monthIndex: month - 1 };
}

function buildMonthRange(mes: string): MonthRange {
  const { year, monthIndex } = parseMonth(mes);
  const startDateTime = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const endDateTime = new Date(
    Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999)
  );

  return {
    mes,
    startDateTime,
    endDateTime,
    startDateOnly: startDateTime.toISOString().slice(0, 10),
    endDateOnly: endDateTime.toISOString().slice(0, 10),
  };
}

export function shiftMonthKey(mes: string, offset: number) {
  const { year, monthIndex } = parseMonth(mes);
  const next = new Date(Date.UTC(year, monthIndex + offset, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildMonthSequence(meses: number, mesReferencia?: string) {
  const referenceMes =
    mesReferencia ??
    `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;
  return Array.from({ length: meses }, (_, index) =>
    shiftMonthKey(referenceMes, index - (meses - 1))
  );
}

function centsToNumber(value: number) {
  return value / 100;
}

function ratio(part: number, total: number) {
  if (!total) return 0;
  return part / total;
}

function isCashExpenseType(tipo: CashBreakdownType): tipo is (typeof CASH_EXPENSE_TYPES)[number] {
  return tipo === "fixed_expense" || tipo === "variable_expense";
}

function isNonTransferExpenseType(
  tipo: CashBreakdownType | "transfer"
): tipo is (typeof NON_TRANSFER_EXPENSE_TYPES)[number] {
  return (
    tipo === "fixed_expense" ||
    tipo === "variable_expense" ||
    tipo === "payroll" ||
    tipo === "tax"
  );
}

function monthKeyFromCashRow(row: {
  paidAt: string | null;
  dueDate: string | null;
}) {
  const source = row.paidAt ?? row.dueDate;
  return source ? source.slice(0, 7) : null;
}

function monthKeyFromContractDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getCashBreakdownLabel(tipo: CashBreakdownType) {
  if (tipo === "revenue") return "Receitas";
  if (tipo === "fixed_expense") return "Despesas fixas";
  if (tipo === "variable_expense") return "Despesas variáveis";
  if (tipo === "payroll") return "Folha";
  return "Impostos";
}

function buildCompetenciaBreakdown<T extends string>(
  rows: CompetenciaRow[],
  keySelector: (row: CompetenciaRow) => T
) {
  const totals = new Map<T, number>();
  rows.forEach(row => {
    const key = keySelector(row);
    totals.set(key, (totals.get(key) ?? 0) + row.comissaoTotalCent);
  });

  const totalComissao = rows.reduce((acc, row) => acc + row.comissaoTotalCent, 0);

  return Array.from(totals.entries())
    .map(([key, valorCent]) => ({
      key,
      valor: centsToNumber(valorCent),
      pct: ratio(valorCent, totalComissao),
    }))
    .sort((a, b) => b.valor - a.valor);
}

function buildWhereByTipo(tipo: DrilldownTipo) {
  if (tipo === "revenue") {
    return eq(procfyTransactions.transactionType, "revenue");
  }

  if (tipo === "expense") {
    return inArray(procfyTransactions.transactionType, NON_TRANSFER_EXPENSE_TYPES);
  }

  return undefined;
}

function buildCashDateWhere(range: MonthRange) {
  return or(
    and(
      eq(procfyTransactions.paid, true),
      gte(procfyTransactions.paidAt, range.startDateOnly),
      lte(procfyTransactions.paidAt, range.endDateOnly)
    ),
    and(
      eq(procfyTransactions.paid, true),
      isNull(procfyTransactions.paidAt),
      gte(procfyTransactions.dueDate, range.startDateOnly),
      lte(procfyTransactions.dueDate, range.endDateOnly)
    )
  );
}

async function queryCompetenciaRows(range: MonthRange) {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database indisponível",
    });
  }
  await assertProcfySchema(db);

  return db
    .select({
      produto: contratos.produto,
      vendedorNome: contratos.vendedorNome,
      liquidoLiberadoCent: contratos.liquidoLiberadoCent,
      comissaoTotalCent: contratos.comissaoTotalCent,
    })
    .from(contratos)
    .where(
      and(
        gte(contratos.dataPagamento, range.startDateTime),
        lte(contratos.dataPagamento, range.endDateTime)
      )
    );
}

async function queryCaixaRows(range: MonthRange) {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database indisponível",
    });
  }
  await assertProcfySchema(db);

  return db
    .select({
      idProcfy: procfyTransactions.idProcfy,
      name: procfyTransactions.name,
      description: procfyTransactions.description,
      dueDate: procfyTransactions.dueDate,
      paid: procfyTransactions.paid,
      paidAt: procfyTransactions.paidAt,
      competencyDate: procfyTransactions.competencyDate,
      amountCents: procfyTransactions.amountCents,
      transactionType: procfyTransactions.transactionType,
      paymentMethod: procfyTransactions.paymentMethod,
      categoryId: procfyTransactions.categoryId,
      categoryName: procfyTransactions.categoryName,
      bankAccountId: procfyTransactions.bankAccountId,
      bankAccountName: procfyTransactions.bankAccountName,
      contactId: procfyTransactions.contactId,
      contactName: procfyTransactions.contactName,
      documentNumber: procfyTransactions.documentNumber,
    })
    .from(procfyTransactions)
    .where(buildCashDateWhere(range))
    .orderBy(desc(procfyTransactions.paidAt), desc(procfyTransactions.idProcfy));
}

async function querySerieRows(
  startMes: string,
  endMes: string
): Promise<{ competenciaRows: CompetenciaRow[]; caixaRows: CaixaRow[] }> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database indisponível",
    });
  }
  await assertProcfySchema(db);

  const startRange = buildMonthRange(startMes);
  const endRange = buildMonthRange(endMes);

  const [competenciaRows, caixaRows] = await Promise.all([
    db
      .select({
        produto: contratos.produto,
        vendedorNome: contratos.vendedorNome,
        liquidoLiberadoCent: contratos.liquidoLiberadoCent,
        comissaoTotalCent: contratos.comissaoTotalCent,
        dataPagamento: contratos.dataPagamento,
      })
      .from(contratos)
      .where(
        and(
          gte(contratos.dataPagamento, startRange.startDateTime),
          lte(contratos.dataPagamento, endRange.endDateTime)
        )
      ),
    db
      .select({
        idProcfy: procfyTransactions.idProcfy,
        name: procfyTransactions.name,
        description: procfyTransactions.description,
        dueDate: procfyTransactions.dueDate,
        paid: procfyTransactions.paid,
        paidAt: procfyTransactions.paidAt,
        competencyDate: procfyTransactions.competencyDate,
        amountCents: procfyTransactions.amountCents,
        transactionType: procfyTransactions.transactionType,
        paymentMethod: procfyTransactions.paymentMethod,
        categoryId: procfyTransactions.categoryId,
        categoryName: procfyTransactions.categoryName,
        bankAccountId: procfyTransactions.bankAccountId,
        bankAccountName: procfyTransactions.bankAccountName,
        contactId: procfyTransactions.contactId,
        contactName: procfyTransactions.contactName,
        documentNumber: procfyTransactions.documentNumber,
      })
      .from(procfyTransactions)
      .where(
        or(
          and(
            eq(procfyTransactions.paid, true),
            gte(procfyTransactions.paidAt, startRange.startDateOnly),
            lte(procfyTransactions.paidAt, endRange.endDateOnly)
          ),
          and(
            eq(procfyTransactions.paid, true),
            isNull(procfyTransactions.paidAt),
            gte(procfyTransactions.dueDate, startRange.startDateOnly),
            lte(procfyTransactions.dueDate, endRange.endDateOnly)
          )
        )
      ),
  ]);

  return {
    competenciaRows: competenciaRows.map(row => ({
      produto: row.produto,
      vendedorNome: row.vendedorNome,
      liquidoLiberadoCent: row.liquidoLiberadoCent,
      comissaoTotalCent: row.comissaoTotalCent,
      dataPagamento: row.dataPagamento,
    })) as CompetenciaRow[] & Array<{ dataPagamento: Date }>,
    caixaRows,
  };
}

export async function buildResumoFinanceiro(
  mes: string
): Promise<ResumoFinanceiro> {
  const range = buildMonthRange(mes);
  const [competenciaRows, caixaRows] = await Promise.all([
    queryCompetenciaRows(range),
    queryCaixaRows(range),
  ]);

  const receitaBrutaCent = competenciaRows.reduce(
    (acc, row) => acc + row.liquidoLiberadoCent,
    0
  );
  const comissaoOptaCent = competenciaRows.reduce(
    (acc, row) => acc + row.comissaoTotalCent,
    0
  );
  const porProduto = buildCompetenciaBreakdown(competenciaRows, row => row.produto);
  const porVendedor = buildCompetenciaBreakdown(
    competenciaRows,
    row => row.vendedorNome
  );

  let totalReceitasCent = 0;
  let totalDespesasCent = 0;
  let totalFolhaCent = 0;
  let totalImpostosCent = 0;
  const categoryTotals = new Map<string, { tipo: CashBreakdownType; valorCent: number }>();
  const typeTotals = new Map<CashBreakdownType, number>();

  caixaRows.forEach(row => {
    if (!DRE_TYPES.includes(row.transactionType as CashBreakdownType)) {
      return;
    }

    const value = row.amountCents;
    const category = row.categoryName || "Sem categoria";
    const tipo = row.transactionType as CashBreakdownType;
    const categoryKey = `${tipo}:${category}`;

    categoryTotals.set(categoryKey, {
      tipo,
      valorCent: (categoryTotals.get(categoryKey)?.valorCent ?? 0) + value,
    });
    typeTotals.set(tipo, (typeTotals.get(tipo) ?? 0) + value);

    if (tipo === "revenue") totalReceitasCent += value;
    if (isCashExpenseType(tipo)) totalDespesasCent += value;
    if (tipo === "payroll") totalFolhaCent += value;
    if (tipo === "tax") totalImpostosCent += value;
  });

  const saldosContas = await procfyService
    .fetchBankAccounts()
    .then(accounts =>
      accounts
        .map(account => ({
          conta: account.name,
          saldo: centsToNumber(account.balanceCents),
        }))
        .sort((a, b) => b.saldo - a.saldo)
    )
    .catch(error => {
      console.error("[Financeiro] Falha ao carregar saldos Procfy", error);
      return [] as Array<{ conta: string; saldo: number }>;
    });

  const porCategoria = Array.from(categoryTotals.entries())
    .map(([key, entry]) => {
      const [, categoria] = key.split(":");
      const denominator = typeTotals.get(entry.tipo) ?? 0;
      return {
        categoria,
        tipo: entry.tipo,
        valor: centsToNumber(entry.valorCent),
        pct: ratio(entry.valorCent, denominator),
      };
    })
    .sort((a, b) => b.valor - a.valor);

  const resultadoLiquidoCent =
    totalReceitasCent - totalDespesasCent - totalFolhaCent - totalImpostosCent;

  return {
    competencia: {
      mes,
      receitaBruta: centsToNumber(receitaBrutaCent),
      comissaoOpta: centsToNumber(comissaoOptaCent),
      quantidadeContratos: competenciaRows.length,
      porProduto: porProduto.map(item => ({
        produto: item.key,
        valor: item.valor,
        pct: item.pct,
      })),
      porVendedor: porVendedor.map(item => ({
        vendedor: item.key,
        valor: item.valor,
        pct: item.pct,
      })),
    },
    caixa: {
      totalReceitas: centsToNumber(totalReceitasCent),
      totalDespesas: centsToNumber(totalDespesasCent),
      totalFolha: centsToNumber(totalFolhaCent),
      totalImpostos: centsToNumber(totalImpostosCent),
      resultadoLiquido: centsToNumber(resultadoLiquidoCent),
      porCategoria,
      saldosContas,
    },
    comparativo: {
      comissaoVsReceitaCaixa: ratio(comissaoOptaCent, totalReceitasCent),
      gap: centsToNumber(totalReceitasCent - comissaoOptaCent),
    },
  };
}

export async function buildSerieHistorica(params: {
  meses?: number;
  mesReferencia?: string;
}): Promise<SerieHistoricaItem[]> {
  const meses = Math.max(1, Math.min(params.meses ?? 6, 24));
  const months = buildMonthSequence(meses, params.mesReferencia);
  const { competenciaRows, caixaRows } = await querySerieRows(
    months[0],
    months[months.length - 1]
  );

  const seriesMap = new Map(
    months.map(mes => [
      mes,
      {
        mes,
        competencia: 0,
        receitas: 0,
        despesas: 0,
        resultado: 0,
      } satisfies SerieHistoricaItem,
    ])
  );

  (competenciaRows as Array<CompetenciaRow & { dataPagamento: Date }>).forEach(
    row => {
      const key = monthKeyFromContractDate(row.dataPagamento);
      const item = seriesMap.get(key);
      if (!item) return;
      item.competencia += row.comissaoTotalCent;
    }
  );

  caixaRows.forEach(row => {
    const key = monthKeyFromCashRow(row);
    if (!key) return;
    const item = seriesMap.get(key);
    if (!item) return;

    if (row.transactionType === "revenue") {
      item.receitas += row.amountCents;
      item.resultado += row.amountCents;
      return;
    }

    if (isCashExpenseType(row.transactionType as CashBreakdownType)) {
      item.despesas += row.amountCents;
      item.resultado -= row.amountCents;
      return;
    }

    if (row.transactionType === "payroll" || row.transactionType === "tax") {
      item.resultado -= row.amountCents;
    }
  });

  return months.map(mes => seriesMap.get(mes)!);
}

export async function buildFinanceiroInvestigationPack(
  mes: string
): Promise<FinanceiroInvestigationPack> {
  const range = buildMonthRange(mes);
  const caixaRows = await queryCaixaRows(range);

  const expenseRows = caixaRows.filter(row =>
    isNonTransferExpenseType(row.transactionType)
  );
  const revenueRows = caixaRows.filter(row => row.transactionType === "revenue");

  const totalRevenueCents = revenueRows.reduce((acc, row) => acc + row.amountCents, 0);
  const totalCostsCents = expenseRows.reduce((acc, row) => acc + row.amountCents, 0);

  const typeTotals = new Map<CashBreakdownType, number>();
  const categoryTotals = new Map<
    string,
    { tipo: CashBreakdownType; valorCent: number }
  >();
  const payrollTotals = new Map<string, number>();

  expenseRows.forEach(row => {
    const tipo = row.transactionType as CashBreakdownType;
    typeTotals.set(tipo, (typeTotals.get(tipo) ?? 0) + row.amountCents);

    const category = row.categoryName || "Sem categoria";
    const categoryKey = `${tipo}:${category}`;
    categoryTotals.set(categoryKey, {
      tipo,
      valorCent: (categoryTotals.get(categoryKey)?.valorCent ?? 0) + row.amountCents,
    });

    if (tipo === "payroll") {
      payrollTotals.set(category, (payrollTotals.get(category) ?? 0) + row.amountCents);
    }
  });

  const topExpenseCategories = Array.from(categoryTotals.entries())
    .map(([key, entry]) => {
      const [, categoria] = key.split(":");
      const typeTotal = typeTotals.get(entry.tipo) ?? 0;
      return {
        categoria,
        tipo: entry.tipo,
        valor: centsToNumber(entry.valorCent),
        pctOfCosts: ratio(entry.valorCent, totalCostsCents),
        pctWithinType: ratio(entry.valorCent, typeTotal),
      };
    })
    .sort((a, b) => b.valor - a.valor);

  const payrollBreakdown = Array.from(payrollTotals.entries())
    .map(([categoria, valorCent]) => ({
      categoria,
      valor: centsToNumber(valorCent),
      pctOfPayroll: ratio(valorCent, typeTotals.get("payroll") ?? 0),
    }))
    .sort((a, b) => b.valor - a.valor);

  const categoryBridge = topExpenseCategories.slice(0, 5).map(item => ({
    label: `${item.categoria} (${getCashBreakdownLabel(item.tipo)})`,
    valor: item.valor,
    pctOfCosts: item.pctOfCosts,
  }));
  const topBridgeValue = categoryBridge.reduce((acc, item) => acc + item.valor, 0);
  const totalCosts = centsToNumber(totalCostsCents);
  if (totalCosts - topBridgeValue > 0.009) {
    categoryBridge.push({
      label: "Outros custos",
      valor: Number((totalCosts - topBridgeValue).toFixed(2)),
      pctOfCosts: totalCosts > 0 ? (totalCosts - topBridgeValue) / totalCosts : 0,
    });
  }

  const toDrilldownRow = (row: CaixaRow): DrilldownTransacao => ({
    id: row.idProcfy,
    name:
      row.name ||
      row.description ||
      row.documentNumber ||
      `Transação ${row.idProcfy}`,
    tipo: row.transactionType,
    categoria: row.categoryName || "Sem categoria",
    conta: row.bankAccountName || "Sem conta",
    contato: row.contactName || "Sem contato",
    valor: centsToNumber(row.amountCents),
    pago: row.paid,
    dataPagamento: row.paidAt ?? row.dueDate,
    dataCompetencia: row.competencyDate,
    metodoPagamento: row.paymentMethod,
  });

  const topExpenseTransactions = expenseRows
    .slice()
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 8)
    .map(toDrilldownRow);

  const topRevenueTransactions = revenueRows
    .slice()
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 6)
    .map(toDrilldownRow);

  const saldosContas = await procfyService
    .fetchBankAccounts()
    .then(accounts =>
      accounts
        .map(account => ({
          conta: account.name,
          saldo: centsToNumber(account.balanceCents),
        }))
        .sort((a, b) => a.saldo - b.saldo)
    )
    .catch(error => {
      console.error("[Financeiro] Falha ao carregar saldos Procfy", error);
      return [] as Array<{ conta: string; saldo: number }>;
    });

  const lowBalanceThreshold = totalCosts > 0 ? totalCosts * 0.15 : 0;
  const accountRisk = saldosContas.map(item => ({
    conta: item.conta,
    saldo: item.saldo,
    status:
      item.saldo < 0
        ? ("negative" as const)
        : item.saldo <= lowBalanceThreshold && lowBalanceThreshold > 0
          ? ("low" as const)
          : ("healthy" as const),
  }));

  return {
    totalCosts,
    typeBreakdown: Array.from(typeTotals.entries())
      .map(([tipo, valorCent]) => ({
        tipo,
        label: getCashBreakdownLabel(tipo),
        valor: centsToNumber(valorCent),
        pctOfCosts: ratio(valorCent, totalCostsCents),
        pctOfRevenue: ratio(valorCent, totalRevenueCents),
      }))
      .sort((a, b) => b.valor - a.valor),
    topExpenseCategories: topExpenseCategories.slice(0, 8),
    payrollBreakdown: payrollBreakdown.slice(0, 6),
    categoryBridge,
    topExpenseTransactions,
    topRevenueTransactions,
    accountRisk,
    availableFilters: {
      categorias: Array.from(
        new Set(caixaRows.map(row => row.categoryName || "Sem categoria"))
      ).sort((a, b) => a.localeCompare(b)),
      contas: Array.from(
        new Set(caixaRows.map(row => row.bankAccountName || "Sem conta"))
      ).sort((a, b) => a.localeCompare(b)),
    },
  };
}

export async function buildDrilldownTransacoes(
  input: DrilldownInput
): Promise<{
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: DrilldownTransacao[];
}> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database indisponível",
    });
  }
  await assertProcfySchema(db);

  const range = buildMonthRange(input.mes);
  const clauses = [buildCashDateWhere(range)];
  const tipoWhere = buildWhereByTipo(input.tipo ?? "all");
  if (tipoWhere) clauses.push(tipoWhere);
  if (input.categoria) {
    clauses.push(eq(procfyTransactions.categoryName, input.categoria));
  }
  if (input.conta) {
    clauses.push(eq(procfyTransactions.bankAccountName, input.conta));
  }

  const whereClause = and(...clauses);
  const totalResult = await db
    .select({ total: count() })
    .from(procfyTransactions)
    .where(whereClause);
  const total = totalResult[0]?.total ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / input.pageSize) : 0;
  const offset = (input.page - 1) * input.pageSize;

  const rows = await db
    .select({
      idProcfy: procfyTransactions.idProcfy,
      name: procfyTransactions.name,
      description: procfyTransactions.description,
      transactionType: procfyTransactions.transactionType,
      categoryName: procfyTransactions.categoryName,
      bankAccountName: procfyTransactions.bankAccountName,
      contactName: procfyTransactions.contactName,
      amountCents: procfyTransactions.amountCents,
      paid: procfyTransactions.paid,
      paidAt: procfyTransactions.paidAt,
      competencyDate: procfyTransactions.competencyDate,
      paymentMethod: procfyTransactions.paymentMethod,
      dueDate: procfyTransactions.dueDate,
      documentNumber: procfyTransactions.documentNumber,
    })
    .from(procfyTransactions)
    .where(whereClause)
    .orderBy(
      desc(procfyTransactions.paidAt),
      desc(procfyTransactions.dueDate),
      asc(procfyTransactions.idProcfy)
    )
    .limit(input.pageSize)
    .offset(offset);

  return {
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages,
    data: rows.map(row => ({
      id: row.idProcfy,
      name:
        row.name ||
        row.description ||
        row.documentNumber ||
        `Transação ${row.idProcfy}`,
      tipo: row.transactionType,
      categoria: row.categoryName || "Sem categoria",
      conta: row.bankAccountName || "Sem conta",
      contato: row.contactName || "Sem contato",
      valor: centsToNumber(row.amountCents),
      pago: row.paid,
      dataPagamento: row.paidAt ?? row.dueDate,
      dataCompetencia: row.competencyDate,
      metodoPagamento: row.paymentMethod,
    })),
  };
}
