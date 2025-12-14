import { inArray } from "drizzle-orm";
import { contratos, zohoContratosSnapshot } from "../../drizzle/schema";
import { getDb } from "../db";
import { normalizeContratoZoho } from "./normalizeZoho";
import { zohoService } from "../zohoService";

export interface SyncRange {
  mesInicio: string; // yyyy-mm-dd
  mesFim: string; // yyyy-mm-dd
  maxRecords?: 200 | 500 | 1000;
}

export interface SyncMetrics {
  fetched: number;
  upserted: number;
  unchanged: number;
  skipped: number;
  durationMs: number;
  warnings: string[];
  range: SyncRange;
}

export function buildMonthRange(year: number, monthIndexZeroBased: number): SyncRange {
  const mes = String(monthIndexZeroBased + 1).padStart(2, "0");
  const mesInicio = `${year}-${mes}-01`;
  const ultimoDia = new Date(year, monthIndexZeroBased + 1, 0).getDate();
  const mesFim = `${year}-${mes}-${String(ultimoDia).padStart(2, "0")}`;
  return { mesInicio, mesFim };
}

export function buildCurrentAndPreviousRange(): { atual: SyncRange; anterior: SyncRange } {
  const now = new Date();
  const atual = buildMonthRange(now.getFullYear(), now.getMonth());
  const anteriorDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const anterior = buildMonthRange(anteriorDate.getFullYear(), anteriorDate.getMonth());
  return { atual, anterior };
}

export async function syncContratosGestao(range: SyncRange): Promise<SyncMetrics> {
  const started = Date.now();
  const db = await getDb();
  if (!db) {
    console.warn("[GestaoSync] Database not available, skipping sync");
    return {
      fetched: 0,
      upserted: 0,
      unchanged: 0,
      skipped: 0,
      durationMs: 0,
      warnings: ["database_unavailable"],
      range,
    };
  }

  const rawContratos = await zohoService.buscarContratosRaw(range);
  const ids = rawContratos.map((c) => c.ID);

  const existingHashes =
    ids.length > 0
      ? await db
          .select({
            idContrato: zohoContratosSnapshot.idContrato,
            sourceHash: zohoContratosSnapshot.sourceHash,
          })
          .from(zohoContratosSnapshot)
          .where(inArray(zohoContratosSnapshot.idContrato, ids))
      : [];

  const hashMap = new Map(existingHashes.map((row) => [row.idContrato, row.sourceHash]));

  let upserted = 0;
  let unchanged = 0;
  let skipped = 0;
  const warnings: string[] = [];

  for (const raw of rawContratos) {
    const normalized = normalizeContratoZoho(raw);
    if (!normalized) {
      skipped++;
      warnings.push(`contrato ${raw.ID}: normalizacao_falhou`);
      continue;
    }

    const { snapshot, contrato, warnings: localWarnings } = normalized;
    const existingHash = hashMap.get(snapshot.idContrato);
    if (existingHash === snapshot.sourceHash) {
      unchanged++;
      continue;
    }

    await db
      .insert(zohoContratosSnapshot)
      .values(snapshot)
      .onDuplicateKeyUpdate({
        set: {
          payloadRaw: snapshot.payloadRaw,
          sourceHash: snapshot.sourceHash,
          fetchedAt: snapshot.fetchedAt,
        },
      });

    await db
      .insert(contratos)
      .values(contrato)
      .onDuplicateKeyUpdate({
        set: {
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
        },
      });

    upserted++;
    localWarnings.forEach((w) => warnings.push(`contrato ${snapshot.idContrato}: ${w}`));
  }

  const durationMs = Date.now() - started;
  console.log(
    `[GestaoSync] range ${range.mesInicio} -> ${range.mesFim} | fetched=${rawContratos.length} | upserted=${upserted} | unchanged=${unchanged} | skipped=${skipped} | duration=${durationMs}ms`
  );

  return { fetched: rawContratos.length, upserted, unchanged, skipped, durationMs, warnings, range };
}

export async function syncContratosGestaoMesAtualEAnterior(): Promise<SyncMetrics[]> {
  const ranges = buildCurrentAndPreviousRange();
  const resultados: SyncMetrics[] = [];

  resultados.push(await syncContratosGestao(ranges.atual));
  resultados.push(await syncContratosGestao(ranges.anterior));

  return resultados;
}
