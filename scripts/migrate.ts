import "dotenv/config";
import { runDatabaseMigrations } from "../server/_core/migrations";

async function main() {
  const result = await runDatabaseMigrations({
    reason: "manual-cli",
    required: true,
  });

  if (!result.ran) {
    throw new Error("No migrations were executed");
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
