import { nanoid } from "nanoid";
import { procfySyncLogs, procfyTransactions } from "../../drizzle/schema";
import { getDb } from "../db";
import { procfyService, type ProcfyTransaction } from "./procfyService";

export type ProcfySyncRange = {
  inicio: string;
  fim: string;
};

export type ProcfySyncMetrics = {
  fetched: number;
  upserted: number;
  durationMs: number;
  range: ProcfySyncRange;
};

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toDateOrNull(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeRange(
  inicio: string,
  fim: string
): ProcfySyncRange {
  const start = parseDateOnly(inicio);
  const end = parseDateOnly(fim);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`Datas inválidas: inicio=${inicio} fim=${fim}`);
  }

  if (start.getTime() <= end.getTime()) {
    return { inicio, fim };
  }

  return { inicio: fim, fim: inicio };
}

export function splitRangeByMonth(inicio: string, fim: string): ProcfySyncRange[] {
  const normalized = normalizeRange(inicio, fim);
  const start = parseDateOnly(normalized.inicio);
  const end = parseDateOnly(normalized.fim);
  const ranges: ProcfySyncRange[] = [];

  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)
  );
  const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (cursor.getTime() <= endMonth.getTime()) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0));
    const effectiveStart =
      monthStart.getTime() < start.getTime() ? start : monthStart;
    const effectiveEnd = monthEnd.getTime() > end.getTime() ? end : monthEnd;

    ranges.push({
      inicio: toIsoDate(effectiveStart),
      fim: toIsoDate(effectiveEnd),
    });

    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return ranges;
}

function toInsertValues(transaction: ProcfyTransaction) {
  return {
    idProcfy: transaction.id,
    name: transaction.name || "",
    description: transaction.description,
    dueDate: transaction.dueDate,
    paid: transaction.paid,
    paidAt: transaction.paidAt,
    competencyDate: transaction.competencyDate,
    amountCents: transaction.amountCents,
    transactionType: transaction.transactionType,
    paymentMethod: transaction.paymentMethod,
    categoryId: transaction.categoryId,
    categoryName: transaction.categoryName,
    bankAccountId: transaction.bankAccountId,
    bankAccountName: transaction.bankAccountName,
    contactId: transaction.contactId,
    contactName: transaction.contactName,
    documentNumber: transaction.documentNumber,
    installmentNumber: transaction.installmentNumber,
    installmentTotal: transaction.installmentTotal,
    createdAtProcfy: toDateOrNull(transaction.createdAt),
    syncedAt: new Date(),
  };
}

export async function syncProcfyRange(
  inicio: string,
  fim: string
): Promise<ProcfySyncMetrics> {
  const range = normalizeRange(inicio, fim);
  const started = Date.now();
  const db = await getDb();

  if (!db) {
    throw new Error("Database indisponível");
  }

  const transactions = await procfyService.fetchTransactions({
    startDate: range.inicio,
    endDate: range.fim,
  });

  for (const transaction of transactions) {
    const values = toInsertValues(transaction);
    await db
      .insert(procfyTransactions)
      .values(values)
      .onDuplicateKeyUpdate({
        set: {
          name: values.name,
          description: values.description,
          dueDate: values.dueDate,
          paid: values.paid,
          paidAt: values.paidAt,
          competencyDate: values.competencyDate,
          amountCents: values.amountCents,
          transactionType: values.transactionType,
          paymentMethod: values.paymentMethod,
          categoryId: values.categoryId,
          categoryName: values.categoryName,
          bankAccountId: values.bankAccountId,
          bankAccountName: values.bankAccountName,
          contactId: values.contactId,
          contactName: values.contactName,
          documentNumber: values.documentNumber,
          installmentNumber: values.installmentNumber,
          installmentTotal: values.installmentTotal,
          createdAtProcfy: values.createdAtProcfy,
          syncedAt: new Date(),
        },
      });
  }

  const durationMs = Date.now() - started;
  await db.insert(procfySyncLogs).values({
    id: `procfy_${nanoid(12)}`,
    rangeInicio: range.inicio,
    rangeFim: range.fim,
    fetched: transactions.length,
    upserted: transactions.length,
    durationMs,
  });

  console.log(
    `[ProcfySync] range ${range.inicio} -> ${range.fim} | fetched=${transactions.length} | upserted=${transactions.length} | duration=${durationMs}ms`
  );

  return {
    fetched: transactions.length,
    upserted: transactions.length,
    durationMs,
    range,
  };
}

export async function syncProcfyRanges(
  ranges: ProcfySyncRange[],
  onRangeComplete?: (
    range: ProcfySyncRange,
    result:
      | { ok: true; metrics: ProcfySyncMetrics }
      | { ok: false; error: string; durationMs: number }
  ) => void | Promise<void>
) {
  for (const range of ranges) {
    const started = Date.now();
    try {
      const metrics = await syncProcfyRange(range.inicio, range.fim);
      await onRangeComplete?.(range, { ok: true, metrics });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await onRangeComplete?.(range, {
        ok: false,
        error: message,
        durationMs: Date.now() - started,
      });
    }
  }
}
