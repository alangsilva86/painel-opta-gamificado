import path from "node:path";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { getDb } from "../db";
import { ENV } from "./env";

const DEFAULT_MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle");

function shouldRunMigrationsOnStart() {
  if (process.env.DB_MIGRATE_ON_START === "true") return true;
  if (process.env.DB_MIGRATE_ON_START === "false") return false;
  return ENV.isProduction;
}

function isStrictMigrationMode() {
  return process.env.DB_MIGRATE_STRICT === "true";
}

export async function runDatabaseMigrations(options?: {
  reason?: string;
  required?: boolean;
  migrationsFolder?: string;
}) {
  const reason = options?.reason ?? "startup";
  const required = options?.required ?? false;
  const migrationsFolder =
    options?.migrationsFolder ?? DEFAULT_MIGRATIONS_FOLDER;

  if (!ENV.databaseUrl) {
    console.log(
      `[Database] Skipping migrations for ${reason}: DATABASE_URL not configured`
    );
    return { ran: false, skipped: true as const };
  }

  const db = await getDb();
  if (!db) {
    const error = new Error(
      `[Database] Skipping migrations for ${reason}: database connection unavailable`
    );
    if (required) throw error;
    console.warn(error.message);
    return { ran: false, skipped: true as const };
  }

  try {
    console.log(
      `[Database] Running migrations for ${reason} from ${migrationsFolder}`
    );
    await migrate(db, { migrationsFolder });
    console.log(`[Database] Migrations completed for ${reason}`);
    return { ran: true, skipped: false as const };
  } catch (error) {
    console.error(`[Database] Migration failed during ${reason}`, error);
    if (required) throw error;
    return { ran: false, skipped: false as const, error };
  }
}

export async function runStartupMigrations() {
  if (!shouldRunMigrationsOnStart()) {
    console.log("[Database] Startup migrations disabled");
    return { ran: false, skipped: true as const };
  }

  return runDatabaseMigrations({
    reason: "startup",
    required: isStrictMigrationMode(),
  });
}
