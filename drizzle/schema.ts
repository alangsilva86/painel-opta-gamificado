import {
  boolean,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tabela de vendedoras
export const vendedoras = mysqlTable("vendedoras", {
  id: varchar("id", { length: 64 }).primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  foto: text("foto"),
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  visivel: mysqlEnum("visivel", ["sim", "nao"]).default("sim").notNull(), // Controla se aparece no dashboard
  createdAt: timestamp("createdAt").defaultNow(),
});

export type Vendedora = typeof vendedoras.$inferSelect;
export type InsertVendedora = typeof vendedoras.$inferInsert;

// Tabela de metas mensais por vendedora
export const metasVendedor = mysqlTable("metas_vendedor", {
  id: varchar("id", { length: 64 }).primaryKey(),
  mes: varchar("mes", { length: 7 }).notNull(), // YYYY-MM
  vendedoraId: varchar("vendedoraId", { length: 64 }).notNull(),
  metaValor: varchar("metaValor", { length: 20 }).notNull(), // Armazenado como string para precisão
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type MetaVendedor = typeof metasVendedor.$inferSelect;
export type InsertMetaVendedor = typeof metasVendedor.$inferInsert;

// Tabela de metas globais mensais
// ATUALIZADO: Agora suporta Meta Global e Super Meta Global separadas
export const metasGlobal = mysqlTable("metas_global", {
  id: varchar("id", { length: 64 }).primaryKey(),
  mes: varchar("mes", { length: 7 }).notNull(), // YYYY-MM
  metaValor: varchar("metaValor", { length: 20 }).notNull(), // Meta Global (100% = +25%)
  superMetaValor: varchar("superMetaValor", { length: 20 }).default("0").notNull(), // Super Meta (100% = +50%)
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type MetaGlobal = typeof metasGlobal.$inferSelect;
export type InsertMetaGlobal = typeof metasGlobal.$inferInsert;

// Tabela de parâmetros do plano de comissionamento
export const parametrosPlano = mysqlTable("parametros_plano", {
  id: varchar("id", { length: 64 }).primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  basePct: varchar("basePct", { length: 10 }).default("0.55").notNull(),
  pctVendedora: varchar("pctVendedora", { length: 10 }).default("0.06").notNull(),
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type ParametroPlano = typeof parametrosPlano.$inferSelect;
export type InsertParametroPlano = typeof parametrosPlano.$inferInsert;

// Tabela de badges/conquistas
export const badges = mysqlTable("badges", {
  id: varchar("id", { length: 64 }).primaryKey(),
  vendedoraId: varchar("vendedoraId", { length: 64 }).notNull(),
  tipo: varchar("tipo", { length: 100 }).notNull(), // primeiro_contrato, hat_trick, imparavel, meta_150, etc
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  icone: varchar("icone", { length: 100 }),
  conquistadoEm: timestamp("conquistadoEm").defaultNow(),
});

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = typeof badges.$inferInsert;

// Tabela de histórico de alterações de metas (auditoria)
export const historicoMetas = mysqlTable("historico_metas", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tipo: mysqlEnum("tipo", ["vendedor", "global"]).notNull(),
  mes: varchar("mes", { length: 7 }).notNull(),
  vendedoraId: varchar("vendedoraId", { length: 64 }),
  valorAnterior: varchar("valorAnterior", { length: 20 }),
  valorNovo: varchar("valorNovo", { length: 20 }).notNull(),
  alteradoPor: varchar("alteradoPor", { length: 64 }).notNull(),
  alteradoEm: timestamp("alteradoEm").defaultNow(),
});

export type HistoricoMeta = typeof historicoMetas.$inferSelect;
export type InsertHistoricoMeta = typeof historicoMetas.$inferInsert;

// Tabela de metas diárias por vendedora
export const metasDiarias = mysqlTable("metas_diarias", {
  id: varchar("id", { length: 64 }).primaryKey(),
  mes: varchar("mes", { length: 7 }).notNull(), // YYYY-MM
  dia: int("dia").notNull(), // 1-31
  vendedoraId: varchar("vendedoraId", { length: 64 }).notNull(),
  metaValor: varchar("metaValor", { length: 20 }).notNull(), // Calculado automaticamente ou editado manualmente
  tipo: mysqlEnum("tipo", ["automatica", "manual"]).default("automatica").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type MetaDiaria = typeof metasDiarias.$inferSelect;
export type InsertMetaDiaria = typeof metasDiarias.$inferInsert;

// Tabela de metas semanais por vendedora
export const metasSemanais = mysqlTable("metas_semanais", {
  id: varchar("id", { length: 64 }).primaryKey(),
  mes: varchar("mes", { length: 7 }).notNull(), // YYYY-MM
  semana: int("semana").notNull(), // 1-5
  vendedoraId: varchar("vendedoraId", { length: 64 }).notNull(),
  metaValor: varchar("metaValor", { length: 20 }).notNull(), // Calculado automaticamente ou editado manualmente
  tipo: mysqlEnum("tipo", ["automatica", "manual"]).default("automatica").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type MetaSemanal = typeof metasSemanais.$inferSelect;
export type InsertMetaSemanal = typeof metasSemanais.$inferInsert;

// Snapshot bruto do Zoho para auditoria e reprocessamento
export const zohoContratosSnapshot = mysqlTable("zoho_contratos_snapshot", {
  idContrato: varchar("id_contrato", { length: 128 }).primaryKey(),
  payloadRaw: text("payload_raw").notNull(),
  sourceHash: varchar("source_hash", { length: 128 }).notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
});

export type ZohoContratoSnapshot = typeof zohoContratosSnapshot.$inferSelect;
export type InsertZohoContratoSnapshot = typeof zohoContratosSnapshot.$inferInsert;

// Tabela normalizada para BI rápido
export const contratos = mysqlTable(
  "contratos",
  {
    idContrato: varchar("id_contrato", { length: 128 }).primaryKey(),
    numeroContrato: varchar("numero_contrato", { length: 128 }).default("").notNull(),
    dataPagamento: timestamp("data_pagamento").notNull(),
    liquidoLiberadoCent: int("liquido_liberado_cent").default(0).notNull(),
    comissaoBaseCent: int("comissao_base_cent").default(0).notNull(),
    comissaoBonusCent: int("comissao_bonus_cent").default(0).notNull(),
    comissaoTotalCent: int("comissao_total_cent").default(0).notNull(),
    pctComissaoBase: decimal("pct_comissao_base", { precision: 10, scale: 6 }).default("0").notNull(),
    pctComissaoBonus: decimal("pct_comissao_bonus", { precision: 10, scale: 6 }).default("0").notNull(),
  vendedorNome: varchar("vendedor_nome", { length: 255 }).default("Sem info").notNull(),
  digitadorNome: varchar("digitador_nome", { length: 255 }).default("Sem info").notNull(),
  produto: varchar("produto", { length: 255 }).default("Sem info").notNull(),
  tipoOperacao: varchar("tipo_operacao", { length: 255 }).default("Sem info").notNull(),
  agenteId: varchar("agente_id", { length: 255 }).default("Sem info").notNull(),
  etapaPipeline: varchar("etapa_pipeline", { length: 255 }).default("Sem info").notNull(),
  inconsistenciaDataPagamento: boolean("inconsistencia_data_pagamento").default(false).notNull(),
  liquidoFallback: boolean("liquido_fallback").default(false).notNull(),
  comissaoCalculada: boolean("comissao_calculada").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    idxDataPagamento: index("idx_contratos_data_pagamento").on(table.dataPagamento),
    idxVendedor: index("idx_contratos_vendedor_nome").on(table.vendedorNome),
    idxEtapa: index("idx_contratos_etapa_pipeline").on(table.etapaPipeline),
    idxProduto: index("idx_contratos_produto").on(table.produto),
    idxTipoOperacao: index("idx_contratos_tipo_operacao").on(table.tipoOperacao),
    idxAgente: index("idx_contratos_agente").on(table.agenteId),
    idxDataEtapa: index("idx_contratos_data_etapa").on(table.dataPagamento, table.etapaPipeline),
    idxDataVendedor: index("idx_contratos_data_vendedor").on(table.dataPagamento, table.vendedorNome),
  })
);

export type Contrato = typeof contratos.$inferSelect;
export type InsertContrato = typeof contratos.$inferInsert;

// Logs do sync de Gestão (qualidade/observabilidade)
export const gestaoSyncLogs = mysqlTable("gestao_sync_logs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  rangeInicio: varchar("range_inicio", { length: 10 }).notNull(), // yyyy-mm-dd
  rangeFim: varchar("range_fim", { length: 10 }).notNull(), // yyyy-mm-dd
  fetched: int("fetched").notNull(),
  upserted: int("upserted").notNull(),
  unchanged: int("unchanged").notNull(),
  skipped: int("skipped").notNull(),
  durationMs: int("duration_ms").notNull(),
  warnings: text("warnings"), // texto/json simples
  createdAt: timestamp("created_at").defaultNow(),
});

export type GestaoSyncLog = typeof gestaoSyncLogs.$inferSelect;
export type InsertGestaoSyncLog = typeof gestaoSyncLogs.$inferInsert;

// Meta de comissão da gestão (separada da meta de vendas das vendedoras)
export const gestaoMetas = mysqlTable("gestao_metas", {
  id: varchar("id", { length: 64 }).primaryKey(),
  mes: varchar("mes", { length: 7 }).notNull(), // YYYY-MM
  metaValor: varchar("metaValor", { length: 32 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type GestaoMeta = typeof gestaoMetas.$inferSelect;
export type InsertGestaoMeta = typeof gestaoMetas.$inferInsert;
