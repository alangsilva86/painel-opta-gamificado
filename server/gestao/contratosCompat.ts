import {
  boolean,
  decimal,
  int,
  mysqlTable,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";
import { contratos, type InsertContrato } from "../../drizzle/schema";

const OPTIONAL_DIMENSION_COLUMNS = {
  vendedorId: "vendedor_id",
  digitadorId: "digitador_id",
  produtoId: "produto_id",
  tipoOperacaoId: "tipo_operacao_id",
  agenteLookupId: "agente_lookup_id",
} as const;

const OPTIONAL_DIMENSION_ENTRIES = Object.entries(
  OPTIONAL_DIMENSION_COLUMNS
) as Array<[keyof typeof OPTIONAL_DIMENSION_COLUMNS, string]>;

const ALL_OPTIONAL_DIMENSION_COLUMNS = OPTIONAL_DIMENSION_ENTRIES.map(
  ([, column]) => column
);

export const CONTRATOS_BASE_SELECT = {
  idContrato: contratos.idContrato,
  numeroContrato: contratos.numeroContrato,
  dataPagamento: contratos.dataPagamento,
  liquidoLiberadoCent: contratos.liquidoLiberadoCent,
  comissaoBaseCent: contratos.comissaoBaseCent,
  comissaoBonusCent: contratos.comissaoBonusCent,
  comissaoTotalCent: contratos.comissaoTotalCent,
  pctComissaoBase: contratos.pctComissaoBase,
  pctComissaoBonus: contratos.pctComissaoBonus,
  vendedorNome: contratos.vendedorNome,
  digitadorNome: contratos.digitadorNome,
  produto: contratos.produto,
  tipoOperacao: contratos.tipoOperacao,
  agenteId: contratos.agenteId,
  etapaPipeline: contratos.etapaPipeline,
  inconsistenciaDataPagamento: contratos.inconsistenciaDataPagamento,
  liquidoFallback: contratos.liquidoFallback,
  comissaoCalculada: contratos.comissaoCalculada,
  updatedAt: contratos.updatedAt,
};

export const contratosLegacy = mysqlTable("contratos", {
  idContrato: varchar("id_contrato", { length: 128 }).primaryKey(),
  numeroContrato: varchar("numero_contrato", { length: 128 })
    .default("")
    .notNull(),
  dataPagamento: timestamp("data_pagamento").notNull(),
  liquidoLiberadoCent: int("liquido_liberado_cent").default(0).notNull(),
  comissaoBaseCent: int("comissao_base_cent").default(0).notNull(),
  comissaoBonusCent: int("comissao_bonus_cent").default(0).notNull(),
  comissaoTotalCent: int("comissao_total_cent").default(0).notNull(),
  pctComissaoBase: decimal("pct_comissao_base", {
    precision: 10,
    scale: 6,
  })
    .default("0")
    .notNull(),
  pctComissaoBonus: decimal("pct_comissao_bonus", {
    precision: 10,
    scale: 6,
  })
    .default("0")
    .notNull(),
  vendedorNome: varchar("vendedor_nome", { length: 255 })
    .default("Sem info")
    .notNull(),
  digitadorNome: varchar("digitador_nome", { length: 255 })
    .default("Sem info")
    .notNull(),
  produto: varchar("produto", { length: 255 }).default("Sem info").notNull(),
  tipoOperacao: varchar("tipo_operacao", { length: 255 })
    .default("Sem info")
    .notNull(),
  agenteId: varchar("agente_id", { length: 255 }).default("Sem info").notNull(),
  etapaPipeline: varchar("etapa_pipeline", { length: 255 })
    .default("Sem info")
    .notNull(),
  inconsistenciaDataPagamento: boolean("inconsistencia_data_pagamento")
    .default(false)
    .notNull(),
  liquidoFallback: boolean("liquido_fallback").default(false).notNull(),
  comissaoCalculada: boolean("comissao_calculada").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type LegacyInsertContrato = typeof contratosLegacy.$inferInsert;

type ContratosColumnState = {
  columns: Set<string>;
  missingOptionalColumns: string[];
};

type ShowColumnsRow = {
  Field?: string;
};

let contratosColumnStatePromise: Promise<ContratosColumnState> | null = null;
let compatibilityWarningLogged = false;

function buildCommonContratoValues(
  contrato: InsertContrato
): InsertContrato {
  return {
    idContrato: contrato.idContrato,
    numeroContrato: contrato.numeroContrato,
    dataPagamento: contrato.dataPagamento,
    liquidoLiberadoCent: contrato.liquidoLiberadoCent,
    comissaoBaseCent: contrato.comissaoBaseCent,
    comissaoBonusCent: contrato.comissaoBonusCent,
    comissaoTotalCent: contrato.comissaoTotalCent,
    pctComissaoBase: contrato.pctComissaoBase,
    pctComissaoBonus: contrato.pctComissaoBonus,
    vendedorNome: contrato.vendedorNome,
    digitadorNome: contrato.digitadorNome,
    produto: contrato.produto,
    tipoOperacao: contrato.tipoOperacao,
    agenteId: contrato.agenteId,
    etapaPipeline: contrato.etapaPipeline,
    inconsistenciaDataPagamento: contrato.inconsistenciaDataPagamento,
    liquidoFallback: contrato.liquidoFallback,
    comissaoCalculada: contrato.comissaoCalculada,
    updatedAt: contrato.updatedAt,
  };
}

function buildLegacyCommonContratoValues(
  contrato: InsertContrato
): LegacyInsertContrato {
  return {
    idContrato: contrato.idContrato,
    numeroContrato: contrato.numeroContrato,
    dataPagamento: contrato.dataPagamento,
    liquidoLiberadoCent: contrato.liquidoLiberadoCent,
    comissaoBaseCent: contrato.comissaoBaseCent,
    comissaoBonusCent: contrato.comissaoBonusCent,
    comissaoTotalCent: contrato.comissaoTotalCent,
    pctComissaoBase: contrato.pctComissaoBase,
    pctComissaoBonus: contrato.pctComissaoBonus,
    vendedorNome: contrato.vendedorNome,
    digitadorNome: contrato.digitadorNome,
    produto: contrato.produto,
    tipoOperacao: contrato.tipoOperacao,
    agenteId: contrato.agenteId,
    etapaPipeline: contrato.etapaPipeline,
    inconsistenciaDataPagamento: contrato.inconsistenciaDataPagamento,
    liquidoFallback: contrato.liquidoFallback,
    comissaoCalculada: contrato.comissaoCalculada,
    updatedAt: contrato.updatedAt,
  };
}

function appendOptionalDimensionValues(
  values: Partial<InsertContrato>,
  contrato: InsertContrato,
  columns: Set<string>
) {
  OPTIONAL_DIMENSION_ENTRIES.forEach(([field, column]) => {
    if (columns.has(column)) {
      values[field] = contrato[field];
    }
  });

  return values;
}

async function inspectContratosColumns(db: any): Promise<ContratosColumnState> {
  try {
    const [rows] = await db.$client.query("SHOW COLUMNS FROM `contratos`");
    const columns = new Set(
      Array.isArray(rows)
        ? rows
            .map((row: ShowColumnsRow) => row.Field?.trim() ?? "")
            .filter(Boolean)
        : []
    );
    const missingOptionalColumns = ALL_OPTIONAL_DIMENSION_COLUMNS.filter(
      column => !columns.has(column)
    );

    if (missingOptionalColumns.length > 0 && !compatibilityWarningLogged) {
      compatibilityWarningLogged = true;
      console.warn(
        `[GestaoCompat] Tabela contratos sem colunas opcionais: ${missingOptionalColumns.join(
          ", "
        )}. Operando em modo compatível até a migration ser aplicada.`
      );
    }

    return { columns, missingOptionalColumns };
  } catch (error) {
    if (!compatibilityWarningLogged) {
      compatibilityWarningLogged = true;
      console.warn(
        "[GestaoCompat] Não foi possível inspecionar as colunas de contratos. Operando em modo compatível.",
        error
      );
    }

    return {
      columns: new Set<string>(),
      missingOptionalColumns: [...ALL_OPTIONAL_DIMENSION_COLUMNS],
    };
  }
}

export async function getContratosColumnState(
  db: any
): Promise<ContratosColumnState> {
  if (!contratosColumnStatePromise) {
    contratosColumnStatePromise = inspectContratosColumns(db);
  }

  return contratosColumnStatePromise;
}

export function hasFullContratoDimensionSchema(columns: Set<string>) {
  return ALL_OPTIONAL_DIMENSION_COLUMNS.every(column => columns.has(column));
}

export function buildContratoInsertValues(
  contrato: InsertContrato,
  columns: Set<string>
): InsertContrato {
  return appendOptionalDimensionValues(
    buildCommonContratoValues(contrato),
    contrato,
    columns
  ) as InsertContrato;
}

export function buildContratoUpdateSet(
  contrato: InsertContrato,
  columns: Set<string>
): Partial<InsertContrato> {
  const values = buildCommonContratoValues(contrato) as Partial<InsertContrato>;
  delete values.idContrato;
  return appendOptionalDimensionValues(values, contrato, columns);
}

export function buildLegacyContratoInsertValues(
  contrato: InsertContrato
): LegacyInsertContrato {
  return buildLegacyCommonContratoValues(contrato);
}

export function buildLegacyContratoUpdateSet(
  contrato: InsertContrato
): Partial<LegacyInsertContrato> {
  const values = buildLegacyCommonContratoValues(
    contrato
  ) as Partial<LegacyInsertContrato>;
  delete values.idContrato;
  return values;
}
