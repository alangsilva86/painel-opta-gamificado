import { TRPCError } from "@trpc/server";

type SchemaState = {
  hasTransactionsTable: boolean;
  hasSyncLogsTable: boolean;
};

type ShowTablesRow = {
  [key: string]: string | undefined;
};

let schemaStatePromise: Promise<SchemaState> | null = null;
let loggedMissingSchema = false;

async function inspectProcfySchema(db: any): Promise<SchemaState> {
  try {
    const [rows] = await db.$client.query("SHOW TABLES");
    const tableNames = new Set(
      Array.isArray(rows)
        ? rows
            .map((row: ShowTablesRow) => Object.values(row)[0]?.trim() ?? "")
            .filter(Boolean)
        : []
    );

    return {
      hasTransactionsTable: tableNames.has("procfy_transactions"),
      hasSyncLogsTable: tableNames.has("procfy_sync_logs"),
    };
  } catch (error) {
    console.warn("[ProcfyCompat] Falha ao inspecionar schema do Procfy", error);
    return {
      hasTransactionsTable: false,
      hasSyncLogsTable: false,
    };
  }
}

export async function getProcfySchemaState(db: any): Promise<SchemaState> {
  if (!schemaStatePromise) {
    schemaStatePromise = inspectProcfySchema(db);
  }

  return schemaStatePromise;
}

export async function assertProcfySchema(db: any) {
  const state = await getProcfySchemaState(db);

  if (state.hasTransactionsTable && state.hasSyncLogsTable) {
    return state;
  }

  if (!loggedMissingSchema) {
    loggedMissingSchema = true;
    console.warn(
      "[ProcfyCompat] Schema Procfy ausente no banco. Aplique a migration 0009_procfy_financeiro.sql."
    );
  }

  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message:
      "Schema financeiro Procfy ausente no banco. Aplique a migration drizzle/0009_procfy_financeiro.sql na base de produção e rode a sincronização novamente.",
  });
}
