import "dotenv/config";
import { syncContratosGestaoMesAtualEAnterior } from "./syncService";

async function main() {
  try {
    const resultados = await syncContratosGestaoMesAtualEAnterior();
    resultados.forEach((r) => {
      console.log(
        `[GestaoSync] FINISHED range ${r.range.mesInicio} -> ${r.range.mesFim} | fetched=${r.fetched} | upserted=${r.upserted} | unchanged=${r.unchanged} | skipped=${r.skipped} | duration=${r.durationMs}ms`
      );
      if (r.warnings.length > 0) {
        console.warn("[GestaoSync] warnings:", r.warnings);
      }
    });
    process.exit(0);
  } catch (error) {
    console.error("[GestaoSync] erro geral", error);
    process.exit(1);
  }
}

void main();
