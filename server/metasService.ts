import { and, eq } from "drizzle-orm";
import {
  calcularDiasUteisDoMes,
  calcularSemanaDoMes,
  calcularSemanasUteisDoMes,
  contarDiasUteis,
  contarDiasUteisCalendario,
  criarCalendarioOperacionalPadrao,
  obterIntervaloSemana,
  obterUltimoDiaDoMes,
} from "@shared/dateUtils";
import {
  metasCalendarioDias,
  metasDiarias,
  metasSemanais,
  metasVendedor,
} from "../drizzle/schema";
import { getDb } from "./db";

export {
  calcularDiasUteisDoMes,
  calcularSemanaDoMes,
  calcularSemanasUteisDoMes,
  contarDiasUteis,
  obterIntervaloSemana,
};

const DISTRIBUICAO_EPSILON = 0.000001;

type MetaDiariaModo = "valor" | "percentual";

type DistribuicaoDiariaInput = {
  metaMensal: number;
  modo: MetaDiariaModo;
  metaValor?: number;
  percentualMeta?: number;
};

export type MetaDiariaPlanejada = {
  dia: number;
  diaUtil: boolean;
  bloqueado: boolean;
  metaValor: string;
  percentualMeta: string;
  tipo: "automatica" | "manual";
};

function assertValidMes(mes: string) {
  if (!/^\d{4}-\d{2}$/.test(mes)) {
    throw new Error("Mês inválido");
  }
}

function assertDiaNoMes(mes: string, dia: number) {
  const ultimoDia = obterUltimoDiaDoMes(mes);
  if (!Number.isInteger(dia) || dia < 1 || dia > ultimoDia) {
    throw new Error("Dia inválido para o mês selecionado");
  }
}

function parseNumeric(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toStoredNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number(value.toFixed(8)).toString();
}

function getCalendarioId(mes: string, dia: number) {
  return `cal_${mes}_${dia}`;
}

function getMetaDiaId(mes: string, dia: number, vendedoraId: string) {
  return `meta_dia_${mes}_${dia}_${vendedoraId}`;
}

function getMetaSemanaId(mes: string, semana: number, vendedoraId: string) {
  return `meta_sem_${mes}_${semana}_${vendedoraId}`;
}

export function calcularDistribuicaoDiariaInput({
  metaMensal,
  modo,
  metaValor,
  percentualMeta,
}: DistribuicaoDiariaInput) {
  const meta = Math.max(0, metaMensal);
  const percentual =
    modo === "percentual"
      ? parseNumeric(percentualMeta)
      : meta > 0
        ? (parseNumeric(metaValor) / meta) * 100
        : parseNumeric(metaValor) === 0
          ? 0
          : Number.POSITIVE_INFINITY;
  const valor =
    modo === "percentual" ? (meta * percentual) / 100 : parseNumeric(metaValor);

  if (!Number.isFinite(percentual) || !Number.isFinite(valor)) {
    throw new Error("Defina a meta mensal antes de distribuir valores");
  }

  if (percentual < 0 || valor < 0) {
    throw new Error("A distribuição não pode ser negativa");
  }

  return {
    percentualMeta: percentual,
    metaValor: valor,
  };
}

export function validarLimiteDistribuicao({
  percentualAtualSemDia,
  novoPercentual,
}: {
  percentualAtualSemDia: number;
  novoPercentual: number;
}) {
  const total = percentualAtualSemDia + novoPercentual;
  if (total > 100 + DISTRIBUICAO_EPSILON) {
    throw new Error(
      `Distribuição acima de 100%. Excesso: ${(total - 100).toFixed(2)} p.p.`
    );
  }
  return total;
}

function percentualDaMeta(
  metaMensal: number,
  metaValor: string,
  percentualMeta?: string
) {
  const percentual = parseNumeric(percentualMeta);
  if (percentual > 0 || parseNumeric(metaValor) === 0) return percentual;
  return metaMensal > 0 ? (parseNumeric(metaValor) / metaMensal) * 100 : 0;
}

export async function listarCalendarioOperacional(mes: string) {
  assertValidMes(mes);
  const db = await getDb();
  const calendarioPadrao = criarCalendarioOperacionalPadrao(mes);
  if (!db) {
    return calendarioPadrao.map(dia => ({
      ...dia,
      tipo: "automatica" as const,
    }));
  }

  const salvos = await db
    .select()
    .from(metasCalendarioDias)
    .where(eq(metasCalendarioDias.mes, mes));
  const salvosMap = new Map(salvos.map(dia => [dia.dia, dia]));

  return calendarioPadrao.map(dia => {
    const salvo = salvosMap.get(dia.dia);
    return {
      dia: dia.dia,
      diaUtil: salvo?.diaUtil ?? dia.diaUtil,
      tipo: (salvo?.tipo ?? "automatica") as "automatica" | "manual",
    };
  });
}

export async function contarDiasUteisOperacionais(mes: string) {
  const calendario = await listarCalendarioOperacional(mes);
  return contarDiasUteisCalendario(calendario);
}

async function obterMetaMensalVendedora(mes: string, vendedoraId: string) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select()
    .from(metasVendedor)
    .where(
      and(
        eq(metasVendedor.mes, mes),
        eq(metasVendedor.vendedoraId, vendedoraId)
      )
    )
    .limit(1);

  return parseNumeric(result[0]?.metaValor);
}

/**
 * Gera metas diárias automáticas para uma vendedora.
 * Divide 100% da meta mensal apenas entre os dias úteis configurados.
 */
export async function gerarMetasDiarias(
  mes: string,
  vendedoraId: string,
  metaMensal: number
) {
  assertValidMes(mes);
  const db = await getDb();
  if (!db) return;

  const calendario = await listarCalendarioOperacional(mes);
  const diasUteis = calendario.filter(dia => dia.diaUtil);
  const percentualDia = diasUteis.length > 0 ? 100 / diasUteis.length : 0;

  const rows: Array<typeof metasDiarias.$inferInsert> = calendario.map(dia => {
    const percentualMeta = dia.diaUtil ? percentualDia : 0;
    const metaValor = (metaMensal * percentualMeta) / 100;

    return {
      id: getMetaDiaId(mes, dia.dia, vendedoraId),
      mes,
      dia: dia.dia,
      vendedoraId,
      metaValor: toStoredNumber(metaValor),
      percentualMeta: toStoredNumber(percentualMeta),
      tipo: "automatica",
    };
  });

  for (const row of rows) {
    await db
      .insert(metasDiarias)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          metaValor: row.metaValor,
          percentualMeta: row.percentualMeta,
          tipo: "automatica",
        },
      });
  }
}

/**
 * Gera metas semanais automáticas considerando apenas os dias úteis configurados.
 */
export async function gerarMetasSemanais(
  mes: string,
  vendedoraId: string,
  metaMensal: number
) {
  assertValidMes(mes);
  const db = await getDb();
  if (!db) return;

  const calendario = await listarCalendarioOperacional(mes);
  const calendarioMap = new Map(calendario.map(dia => [dia.dia, dia.diaUtil]));
  const semanas = calcularSemanasUteisDoMes(mes);
  const diasUteisPorSemana: number[] = [];

  for (let s = 1; s <= semanas; s++) {
    const { diaInicio, diaFim } = obterIntervaloSemana(mes, s);
    let diasUteis = 0;

    for (let d = diaInicio; d <= diaFim; d++) {
      if (calendarioMap.get(d)) diasUteis++;
    }

    diasUteisPorSemana.push(diasUteis);
  }

  const totalDiasUteis = diasUteisPorSemana.reduce((a, b) => a + b, 0);

  for (let s = 1; s <= semanas; s++) {
    const diasUteis = diasUteisPorSemana[s - 1];
    const metaSemanal =
      totalDiasUteis > 0 ? (metaMensal * diasUteis) / totalDiasUteis : 0;

    await db
      .insert(metasSemanais)
      .values({
        id: getMetaSemanaId(mes, s, vendedoraId),
        mes,
        semana: s,
        vendedoraId,
        metaValor: toStoredNumber(metaSemanal),
        tipo: "automatica",
      })
      .onDuplicateKeyUpdate({
        set: {
          metaValor: toStoredNumber(metaSemanal),
          tipo: "automatica",
        },
      });
  }
}

async function recalcularMetasSemanaisAPartirDasDiarias(
  mes: string,
  vendedoraId: string
) {
  const db = await getDb();
  if (!db) return;

  const diarias = await obterMetasDiarias(mes, vendedoraId);
  const diariasMap = new Map(diarias.map(meta => [meta.dia, meta]));
  const semanas = calcularSemanasUteisDoMes(mes);

  for (let semana = 1; semana <= semanas; semana++) {
    const { diaInicio, diaFim } = obterIntervaloSemana(mes, semana);
    let metaSemanal = 0;
    let temManual = false;

    for (let dia = diaInicio; dia <= diaFim; dia++) {
      const metaDia = diariasMap.get(dia);
      metaSemanal += parseNumeric(metaDia?.metaValor);
      if (metaDia?.tipo === "manual") temManual = true;
    }

    await db
      .insert(metasSemanais)
      .values({
        id: getMetaSemanaId(mes, semana, vendedoraId),
        mes,
        semana,
        vendedoraId,
        metaValor: toStoredNumber(metaSemanal),
        tipo: temManual ? "manual" : "automatica",
      })
      .onDuplicateKeyUpdate({
        set: {
          metaValor: toStoredNumber(metaSemanal),
          tipo: temManual ? "manual" : "automatica",
        },
      });
  }
}

/**
 * Atualiza meta diária manualmente usando R$ ou %.
 */
export async function atualizarMetaDiaria(
  mes: string,
  dia: number,
  vendedoraId: string,
  novaMetaValor: number,
  options?: {
    modo?: MetaDiariaModo;
    percentualMeta?: number;
    metaMensal?: number;
  }
) {
  assertValidMes(mes);
  assertDiaNoMes(mes, dia);
  const db = await getDb();
  if (!db) return;

  const calendario = await listarCalendarioOperacional(mes);
  const diaCalendario = calendario.find(item => item.dia === dia);
  if (!diaCalendario?.diaUtil) {
    throw new Error("Não é possível distribuir meta em dia não útil");
  }

  const metaMensal =
    options?.metaMensal ?? (await obterMetaMensalVendedora(mes, vendedoraId));
  const modo = options?.modo ?? "valor";
  const diasUteisSet = new Set(
    calendario.filter(item => item.diaUtil).map(item => item.dia)
  );
  const distribuicao = calcularDistribuicaoDiariaInput({
    metaMensal,
    modo,
    metaValor: novaMetaValor,
    percentualMeta: options?.percentualMeta,
  });

  const diarias = await obterMetasDiarias(mes, vendedoraId);
  const percentualAtualSemDia = diarias.reduce((acc, meta) => {
    if (meta.dia === dia) return acc;
    if (!diasUteisSet.has(meta.dia)) return acc;
    return (
      acc + percentualDaMeta(metaMensal, meta.metaValor, meta.percentualMeta)
    );
  }, 0);
  validarLimiteDistribuicao({
    percentualAtualSemDia,
    novoPercentual: distribuicao.percentualMeta,
  });

  const id = getMetaDiaId(mes, dia, vendedoraId);
  await db
    .insert(metasDiarias)
    .values({
      id,
      mes,
      dia,
      vendedoraId,
      metaValor: toStoredNumber(distribuicao.metaValor),
      percentualMeta: toStoredNumber(distribuicao.percentualMeta),
      tipo: "manual",
    })
    .onDuplicateKeyUpdate({
      set: {
        metaValor: toStoredNumber(distribuicao.metaValor),
        percentualMeta: toStoredNumber(distribuicao.percentualMeta),
        tipo: "manual",
      },
    });

  await recalcularMetasSemanaisAPartirDasDiarias(mes, vendedoraId);
}

export async function alternarDiaUtilOperacional(
  mes: string,
  dia: number,
  diaUtil: boolean
) {
  assertValidMes(mes);
  assertDiaNoMes(mes, dia);
  const db = await getDb();
  if (!db) return;

  await db
    .insert(metasCalendarioDias)
    .values({
      id: getCalendarioId(mes, dia),
      mes,
      dia,
      diaUtil,
      tipo: "manual",
    })
    .onDuplicateKeyUpdate({
      set: {
        diaUtil,
        tipo: "manual",
      },
    });

  if (diaUtil) return;

  const metasMensais = await db
    .select({ vendedoraId: metasVendedor.vendedoraId })
    .from(metasVendedor)
    .where(eq(metasVendedor.mes, mes));
  const idsAfetados = new Set(metasMensais.map(meta => meta.vendedoraId));

  const diariasDoDia = await db
    .select({ vendedoraId: metasDiarias.vendedoraId })
    .from(metasDiarias)
    .where(and(eq(metasDiarias.mes, mes), eq(metasDiarias.dia, dia)));
  diariasDoDia.forEach(meta => idsAfetados.add(meta.vendedoraId));

  await db
    .update(metasDiarias)
    .set({
      metaValor: "0",
      percentualMeta: "0",
      tipo: "manual",
      updatedAt: new Date(),
    })
    .where(and(eq(metasDiarias.mes, mes), eq(metasDiarias.dia, dia)));

  for (const vendedoraId of idsAfetados) {
    await recalcularMetasSemanaisAPartirDasDiarias(mes, vendedoraId);
  }
}

/**
 * Atualiza meta semanal manualmente.
 */
export async function atualizarMetaSemanal(
  mes: string,
  semana: number,
  vendedoraId: string,
  novaMetaValor: number
) {
  const db = await getDb();
  if (!db) return;

  await db
    .insert(metasSemanais)
    .values({
      id: getMetaSemanaId(mes, semana, vendedoraId),
      mes,
      semana,
      vendedoraId,
      metaValor: novaMetaValor.toString(),
      tipo: "manual",
    })
    .onDuplicateKeyUpdate({
      set: {
        metaValor: novaMetaValor.toString(),
        tipo: "manual",
      },
    });
}

/**
 * Obtém metas diárias de uma vendedora no mês.
 */
export async function obterMetasDiarias(mes: string, vendedoraId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(metasDiarias)
    .where(
      and(eq(metasDiarias.mes, mes), eq(metasDiarias.vendedoraId, vendedoraId))
    )
    .orderBy(metasDiarias.dia);
}

/**
 * Obtém metas semanais de uma vendedora no mês.
 */
export async function obterMetasSemanais(mes: string, vendedoraId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(metasSemanais)
    .where(
      and(
        eq(metasSemanais.mes, mes),
        eq(metasSemanais.vendedoraId, vendedoraId)
      )
    )
    .orderBy(metasSemanais.semana);
}

export async function obterMetasOperacionaisPlanejadas(
  mes: string,
  vendedoraId: string
) {
  const [calendario, diarias, semanais, metaMensal] = await Promise.all([
    listarCalendarioOperacional(mes),
    obterMetasDiarias(mes, vendedoraId),
    obterMetasSemanais(mes, vendedoraId),
    obterMetaMensalVendedora(mes, vendedoraId),
  ]);
  const diariasMap = new Map(diarias.map(meta => [meta.dia, meta]));

  const diariasCompletas: MetaDiariaPlanejada[] = calendario.map(dia => {
    const meta = diariasMap.get(dia.dia);
    const percentualMeta = percentualDaMeta(
      metaMensal,
      meta?.metaValor ?? "0",
      meta?.percentualMeta
    );
    const metaValor = (metaMensal * percentualMeta) / 100;

    return {
      dia: dia.dia,
      diaUtil: dia.diaUtil,
      bloqueado: !dia.diaUtil,
      metaValor: toStoredNumber(dia.diaUtil ? metaValor : 0),
      percentualMeta: toStoredNumber(dia.diaUtil ? percentualMeta : 0),
      tipo: (meta?.tipo ?? dia.tipo) as "automatica" | "manual",
    };
  });

  const percentualDistribuido = diariasCompletas.reduce(
    (acc, meta) => acc + parseNumeric(meta.percentualMeta),
    0
  );
  const valorDistribuido = (metaMensal * percentualDistribuido) / 100;

  return {
    diarias: diariasCompletas,
    semanais,
    diasUteis: calendario.filter(dia => dia.diaUtil).length,
    semanasPlanejadas: calcularSemanasUteisDoMes(mes),
    metaMensal,
    distribuicao: {
      metaMensal,
      percentualDistribuido,
      valorDistribuido,
      percentualRestante: Math.max(0, 100 - percentualDistribuido),
      valorRestante: Math.max(0, metaMensal - valorDistribuido),
      excedentePercentual: Math.max(0, percentualDistribuido - 100),
      diasUteis: calendario.filter(dia => dia.diaUtil).length,
    },
  };
}

/**
 * Regenera todas as metas diárias/semanais para um mês.
 * Útil quando a meta mensal é alterada.
 */
export async function regenerarMetasDoMes(mes: string) {
  const db = await getDb();
  if (!db) return;

  const metasDoMes = await db
    .select()
    .from(metasVendedor)
    .where(eq(metasVendedor.mes, mes));

  for (const meta of metasDoMes) {
    const metaValor = parseNumeric(meta.metaValor);
    await gerarMetasDiarias(mes, meta.vendedoraId, metaValor);
    await gerarMetasSemanais(mes, meta.vendedoraId, metaValor);
  }
}

/**
 * Lista todas as metas diárias de um mês (todas as vendedoras).
 */
export async function listarMetasDiariasDoMes(mes: string) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(metasDiarias).where(eq(metasDiarias.mes, mes));
}

/**
 * Lista todas as metas semanais de um mês (todas as vendedoras).
 */
export async function listarMetasSemanaisDoMes(mes: string) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(metasSemanais).where(eq(metasSemanais.mes, mes));
}
