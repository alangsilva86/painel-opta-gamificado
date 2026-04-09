import { ENV } from "../_core/env";

export type ProcfyTransactionType =
  | "revenue"
  | "fixed_expense"
  | "variable_expense"
  | "payroll"
  | "tax"
  | "transfer";

type ProcfyPagination = {
  page?: number;
  items?: number;
  pages?: number;
  last?: number;
  next?: number | null;
  prev?: number | null;
  count?: number;
  from?: number | null;
  to?: number | null;
};

type ProcfyPageResponse<T> = {
  page?: ProcfyPagination;
  data?: T[];
};

type ProcfyBankAccountApi = {
  id?: number | string | null;
  name?: string | null;
  default?: boolean | null;
  initial_balance_cents?: number | string | null;
  balance_cents?: number | string | null;
  balance_currency?: string | null;
  agency?: string | null;
};

type ProcfyCategoryApi = {
  id?: number | string | null;
  name?: string | null;
  description?: string | null;
  transaction_type?: ProcfyTransactionType | null;
};

type ProcfyContactApi = {
  id?: number | string | null;
  name?: string | null;
};

type ProcfyTransactionApi = {
  id?: number | string | null;
  name?: string | null;
  description?: string | null;
  due_date?: string | null;
  paid?: boolean | null;
  paid_at?: string | null;
  competency_date?: string | null;
  amount_cents?: number | string | null;
  transaction_type?: ProcfyTransactionType | null;
  payment_method?: string | null;
  document_number?: string | null;
  installment_number?: number | string | null;
  installment_total?: number | string | null;
  created_at?: string | null;
  bank_account_id?: number | string | null;
  bank_account?: ProcfyBankAccountApi | null;
  category_id?: number | string | null;
  category?: ProcfyCategoryApi | null;
  contact_id?: number | string | null;
  contact?: ProcfyContactApi | null;
};

export type ProcfyBankAccount = {
  id: string;
  name: string;
  balanceCents: number;
  currency: string;
  isDefault: boolean;
  agency: string | null;
};

export type ProcfyTransaction = {
  id: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  paid: boolean;
  paidAt: string | null;
  competencyDate: string | null;
  amountCents: number;
  transactionType: ProcfyTransactionType;
  paymentMethod: string;
  categoryId: string;
  categoryName: string;
  bankAccountId: string;
  bankAccountName: string;
  contactId: string;
  contactName: string;
  documentNumber: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  createdAt: string | null;
};

export type FetchTransactionsParams = {
  startDate: string;
  endDate: string;
  bankAccountIds?: string[];
  categoryIds?: string[];
  contactIds?: string[];
};

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asOptionalString(value: unknown): string | null {
  const normalized = asString(value);
  return normalized.length > 0 ? normalized : null;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asOptionalInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function isTransactionType(value: string): value is ProcfyTransactionType {
  return (
    value === "revenue" ||
    value === "fixed_expense" ||
    value === "variable_expense" ||
    value === "payroll" ||
    value === "tax" ||
    value === "transfer"
  );
}

class ProcfyService {
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly cacheTtlMs = 60_000;
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor() {
    this.apiToken = ENV.procfyApiToken;
    this.baseUrl = normalizeBaseUrl(ENV.procfyBaseUrl);

    if (!this.apiToken) {
      console.warn(
        "[ProcfyService] Missing PROCFY_API_TOKEN. Procfy integration is disabled."
      );
    }
  }

  async fetchTransactions(
    params: FetchTransactionsParams
  ): Promise<ProcfyTransaction[]> {
    const transactions = await this.fetchPaginated<ProcfyTransactionApi>(
      "/transactions",
      query => {
        query.set("start_date", params.startDate);
        query.set("end_date", params.endDate);
        this.appendArrayParam(
          query,
          "bank_account_ids[]",
          params.bankAccountIds
        );
        this.appendArrayParam(query, "category_ids[]", params.categoryIds);
        this.appendArrayParam(query, "contact_ids[]", params.contactIds);
      }
    );

    const missingCategoryIds = new Set<string>();
    const missingContactIds = new Set<string>();
    const missingBankAccountIds = new Set<string>();

    transactions.forEach(transaction => {
      const categoryId = asString(
        transaction.category?.id ?? transaction.category_id
      );
      const contactId = asString(transaction.contact?.id ?? transaction.contact_id);
      const bankAccountId = asString(
        transaction.bank_account?.id ?? transaction.bank_account_id
      );

      if (categoryId && !asString(transaction.category?.name)) {
        missingCategoryIds.add(categoryId);
      }
      if (contactId && !asString(transaction.contact?.name)) {
        missingContactIds.add(contactId);
      }
      if (bankAccountId && !asString(transaction.bank_account?.name)) {
        missingBankAccountIds.add(bankAccountId);
      }
    });

    const [categories, contacts, bankAccounts] = await Promise.all([
      missingCategoryIds.size > 0 ? this.fetchCategories() : Promise.resolve([]),
      missingContactIds.size > 0 ? this.fetchContacts() : Promise.resolve([]),
      missingBankAccountIds.size > 0
        ? this.fetchBankAccounts()
        : Promise.resolve([]),
    ]);

    const categoryMap = new Map(categories.map(item => [item.id, item.name]));
    const contactMap = new Map(contacts.map(item => [item.id, item.name]));
    const bankAccountMap = new Map(
      bankAccounts.map(item => [item.id, item.name])
    );

    return transactions
      .map(transaction =>
        this.normalizeTransaction(
          transaction,
          categoryMap,
          contactMap,
          bankAccountMap
        )
      )
      .filter((item): item is ProcfyTransaction => item !== null);
  }

  async fetchBankAccounts(): Promise<ProcfyBankAccount[]> {
    const rows = await this.fetchPaginated<ProcfyBankAccountApi>(
      "/bank_accounts"
    );

    return rows
      .map(row => {
        const id = asString(row.id);
        if (!id) return null;
        return {
          id,
          name: asString(row.name) || "Conta sem nome",
          balanceCents: Math.trunc(asNumber(row.balance_cents)),
          currency: asString(row.balance_currency) || "BRL",
          isDefault: Boolean(row.default),
          agency: asOptionalString(row.agency),
        } satisfies ProcfyBankAccount;
      })
      .filter((item): item is ProcfyBankAccount => item !== null);
  }

  private async fetchCategories(): Promise<
    Array<{ id: string; name: string; transactionType: ProcfyTransactionType | null }>
  > {
    const rows = await this.fetchPaginated<ProcfyCategoryApi>("/categories");
    return rows
      .map(row => {
        const id = asString(row.id);
        if (!id) return null;
        const type = asString(row.transaction_type);
        return {
          id,
          name: asString(row.name) || "Sem categoria",
          transactionType: isTransactionType(type) ? type : null,
        };
      })
      .filter(
        (
          item
        ): item is {
          id: string;
          name: string;
          transactionType: ProcfyTransactionType | null;
        } => item !== null
      );
  }

  private async fetchContacts(): Promise<Array<{ id: string; name: string }>> {
    const rows = await this.fetchPaginated<ProcfyContactApi>("/contacts");
    return rows
      .map(row => {
        const id = asString(row.id);
        if (!id) return null;
        return {
          id,
          name: asString(row.name) || "Sem contato",
        };
      })
      .filter((item): item is { id: string; name: string } => item !== null);
  }

  private normalizeTransaction(
    transaction: ProcfyTransactionApi,
    categoryMap: Map<string, string>,
    contactMap: Map<string, string>,
    bankAccountMap: Map<string, string>
  ): ProcfyTransaction | null {
    const id = asString(transaction.id);
    const rawType = asString(transaction.transaction_type);
    if (!id || !isTransactionType(rawType)) {
      return null;
    }

    const categoryId = asString(
      transaction.category?.id ?? transaction.category_id
    );
    const bankAccountId = asString(
      transaction.bank_account?.id ?? transaction.bank_account_id
    );
    const contactId = asString(transaction.contact?.id ?? transaction.contact_id);

    const categoryName =
      asString(transaction.category?.name) ||
      categoryMap.get(categoryId) ||
      "Sem categoria";
    const bankAccountName =
      asString(transaction.bank_account?.name) ||
      bankAccountMap.get(bankAccountId) ||
      "Sem conta";
    const contactName =
      asString(transaction.contact?.name) ||
      contactMap.get(contactId) ||
      "Sem contato";

    return {
      id,
      name: asString(transaction.name) || asString(transaction.description),
      description: asOptionalString(transaction.description),
      dueDate: asOptionalString(transaction.due_date),
      paid: Boolean(transaction.paid),
      paidAt: asOptionalString(transaction.paid_at),
      competencyDate: asOptionalString(transaction.competency_date),
      amountCents: Math.trunc(asNumber(transaction.amount_cents)),
      transactionType: rawType,
      paymentMethod: asString(transaction.payment_method) || "no_payment_method",
      categoryId,
      categoryName,
      bankAccountId,
      bankAccountName,
      contactId,
      contactName,
      documentNumber: asOptionalString(transaction.document_number),
      installmentNumber: asOptionalInteger(transaction.installment_number),
      installmentTotal: asOptionalInteger(transaction.installment_total),
      createdAt: asOptionalString(transaction.created_at),
    };
  }

  private appendArrayParam(
    query: URLSearchParams,
    key: string,
    values?: string[]
  ) {
    values?.forEach(value => {
      const normalized = asString(value);
      if (normalized) {
        query.append(key, normalized);
      }
    });
  }

  private async fetchPaginated<T>(
    path: string,
    buildQuery?: (params: URLSearchParams) => void
  ): Promise<T[]> {
    const cacheKey = this.makeCacheKey(path, buildQuery);
    const cached = this.getCache<T[]>(cacheKey);
    if (cached) return cached;

    const results: T[] = [];
    let nextPage: number | null = 1;

    while (nextPage !== null) {
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("items", "50");
      buildQuery?.(params);

      const response = await this.requestJson<ProcfyPageResponse<T>>(
        `${path}?${params.toString()}`
      );

      const pageData = Array.isArray(response.data) ? response.data : [];
      results.push(...pageData);
      nextPage =
        typeof response.page?.next === "number" ? response.page.next : null;
    }

    this.setCache(cacheKey, results);
    return results;
  }

  private makeCacheKey(
    path: string,
    buildQuery?: (params: URLSearchParams) => void
  ) {
    const params = new URLSearchParams();
    buildQuery?.(params);
    return `${path}?${params.toString()}`;
  }

  private async requestJson<T>(pathWithQuery: string): Promise<T> {
    if (!this.apiToken) {
      throw new Error("PROCFY_API_TOKEN não configurado");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch(`${this.baseUrl}${pathWithQuery}`, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Procfy HTTP ${response.status}: ${errorText || response.statusText}`
        );
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }
}

export const procfyService = new ProcfyService();
