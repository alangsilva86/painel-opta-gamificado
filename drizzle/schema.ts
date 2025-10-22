import { mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
export const metasGlobal = mysqlTable("metas_global", {
  id: varchar("id", { length: 64 }).primaryKey(),
  mes: varchar("mes", { length: 7 }).notNull(), // YYYY-MM
  metaValor: varchar("metaValor", { length: 20 }).notNull(),
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
