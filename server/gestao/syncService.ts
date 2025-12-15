import { inArray } from "drizzle-orm";
import { contratos, gestaoSyncLogs, zohoContratosSnapshot } from "../../drizzle/schema";
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

export function normalizeRange(startISO: string, endISO: string): { start: string; end: string } {
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`Datas inválidas: start=${startISO} end=${endISO}`);
  }
  if (start.getTime() <= end.getTime()) return { start: startISO, end: endISO };
  return { start: endISO, end: startISO };
}

export function splitRangeByMonth(startISO: string, endISO: string): SyncRange[] {
  const norm = normalizeRange(startISO, endISO);
  const start = new Date(norm.start);
  const end = new Date(norm.end);
  const ranges: SyncRange[] = [];

  const cursor = new Date(Date.UTC(start.getFullYear(), start.getMonth(), 1));
  const endMonth = new Date(Date.UTC(end.getFullYear(), end.getMonth(), 1));

  while (cursor <= endMonth) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const { mesInicio, mesFim } = buildMonthRange(year, month);

    // Limita início/fim ao intervalo original
    const clampedInicio = cursor.getTime() === new Date(Date.UTC(start.getFullYear(), start.getMonth(), 1)).getTime()
      ? startISO
      : mesInicio;
    const ultimoDia = new Date(year, month + 1, 0).getDate();
    const rawFim = `${year}-${String(month + 1).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
    const clampedFim = month === end.getUTCMonth() && year === end.getUTCFullYear() ? endISO : rawFim;

    ranges.push({ mesInicio: clampedInicio, mesFim: clampedFim });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return ranges;
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

  const logId = `sync_${Date.now()}`;
  await db
    .insert(gestaoSyncLogs)
    .values({
      id: logId,
      rangeInicio: range.mesInicio,
      rangeFim: range.mesFim,
      fetched: rawContratos.length,
      upserted,
      unchanged,
      skipped,
      durationMs,
      warnings: warnings.length > 0 ? warnings.join(" | ") : null,
    })
    .onDuplicateKeyUpdate({
      set: {
        fetched: rawContratos.length,
        upserted,
        unchanged,
        skipped,
        durationMs,
        warnings: warnings.length > 0 ? warnings.join(" | ") : null,
        createdAt: new Date(),
      },
    });

  return { fetched: rawContratos.length, upserted, unchanged, skipped, durationMs, warnings, range };
}

export async function syncContratosGestaoMesAtualEAnterior(): Promise<SyncMetrics[]> {
  const ranges = buildCurrentAndPreviousRange();
  const resultados: SyncMetrics[] = [];

  resultados.push(await syncContratosGestao(ranges.atual));
  resultados.push(await syncContratosGestao(ranges.anterior));

  return resultados;
}

export async function syncContratosGestaoIntervalo(
  dateFrom: string,
  dateTo: string,
  maxRecords: SyncRange["maxRecords"] = 1000,
  onProgress?: (range: SyncRange, metrics: SyncMetrics) => void
) {
  const ranges = splitRangeByMonth(dateFrom, dateTo);
  const concurrency = 3;
  const timeoutMs = 30_000;

  const results: SyncMetrics[] = [];

  let index = 0;
  const worker = async () => {
    while (true) {
      const current = index++;
      if (current >= ranges.length) break;
      const r = ranges[current];
      console.log(`[GestaoSync] Sincronizando range mensal ${r.mesInicio} -> ${r.mesFim}`);
      try {
        const task = syncContratosGestao({ ...r, maxRecords });
        const result = await Promise.race([
          task,
          new Promise<SyncMetrics>((_, reject) =>
            setTimeout(() => reject(new Error("timeout_sync_mes")), timeoutMs)
          ),
        ]);
        onProgress?.(r, result);
        results[current] = result;
      } catch (err: any) {
        console.warn(
          `[GestaoSync] Erro ao sincronizar range ${r.mesInicio} -> ${r.mesFim}, pulando. Motivo:`,
          err?.message ?? err
        );
        const fallback: SyncMetrics = {
          fetched: 0,
          upserted: 0,
          unchanged: 0,
          skipped: 0,
          durationMs: timeoutMs,
          warnings: [`erro_sync_range_${r.mesInicio}_${r.mesFim}`],
          range: r,
        };
        onProgress?.(r, fallback);
        results[current] = fallback;
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, ranges.length) }, () => worker());
  await Promise.all(workers);

  return results;
}
