export type CompetenciaSnapshot = {
  mes: string;
  receitaBruta: number;
  comissaoOpta: number;
  quantidadeContratos: number;
  porProduto: Array<{ produto: string; valor: number; pct: number }>;
  porVendedor: Array<{ vendedor: string; valor: number; pct: number }>;
};

export type CaixaSnapshot = {
  totalReceitas: number;
  totalDespesas: number;
  totalFolha: number;
  totalImpostos: number;
  resultadoLiquido: number;
  porCategoria: Array<{
    categoria: string;
    tipo: "revenue" | "fixed_expense" | "variable_expense" | "payroll" | "tax";
    valor: number;
    pct: number;
  }>;
  saldosContas: Array<{
    conta: string;
    saldo: number;
  }>;
};

export type ComparativoSnapshot = {
  comissaoVsReceitaCaixa: number;
  gap: number;
};

export type ResumoFinanceiro = {
  competencia: CompetenciaSnapshot;
  caixa: CaixaSnapshot;
  comparativo: ComparativoSnapshot;
};

export type SerieHistoricaItem = {
  mes: string;
  competencia: number;
  receitas: number;
  despesas: number;
  resultado: number;
};

export type TransacaoProcfy = {
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

export type DrilldownFinanceiroResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: TransacaoProcfy[];
};

export type FinanceiroSyncStatus = {
  id: string;
  status: "pending" | "running" | "done";
  totalMonths: number;
  completedMonths: number;
  perMonth: Array<{
    inicio: string;
    fim: string;
    status: "done" | "error";
    fetched: number;
    upserted: number;
    durationMs: number;
    error?: string | null;
  }>;
  startedAt: string | Date;
  finishedAt?: string | Date;
};

// ---------------------------------------------------------------------------
// Analyst chat types
// ---------------------------------------------------------------------------

export type FinanceiroAnalystAction = {
  type: "change_month";
  label: string;
  mes: string;
};

export type FinanceiroAnalystResponse = {
  answer: string;
  summary?: string;
  evidence: string[];
  riskLevel: "low" | "medium" | "high";
  recommendedActions: FinanceiroAnalystAction[];
  followUpPrompts: string[];
  contextLabel: string;
};

export type FinanceiroAnalystMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  response?: FinanceiroAnalystResponse;
};
