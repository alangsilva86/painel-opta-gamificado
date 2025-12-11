import { getDb } from "./db";
import { metasDiarias, metasSemanais, metasVendedor } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Calcula quantos dias úteis existem entre duas datas
 */
function contarDiasUteis(dataInicio: Date, dataFim: Date): number {
  let dias = 0;
  const data = new Date(dataInicio);

  while (data <= dataFim) {
    const dia = data.getDay();
    if (dia !== 0 && dia !== 6) dias++; // Não conta sábado (6) e domingo (0)
    data.setDate(data.getDate() + 1);
  }

  return dias;
}

/**
 * Calcula a semana do mês para um dia específico
 */
function calcularSemanaDoMes(dia: number): number {
  return Math.ceil(dia / 7);
}

/**
 * Calcula o intervalo de dias de uma semana específica do mês
 */
function obterIntervaloSemana(mes: string, semana: number) {
  const [ano, mesNum] = mes.split("-").map(Number);
  const ultimoDia = new Date(ano, mesNum, 0).getDate();

  const diaInicio = (semana - 1) * 7 + 1;
  const diaFim = Math.min(semana * 7, ultimoDia);

  return { diaInicio, diaFim };
}

/**
 * Gera metas diárias automáticas para uma vendedora
 * Divide a meta mensal pelos dias úteis do mês
 */
export async function gerarMetasDiarias(
  mes: string,
  vendedoraId: string,
  metaMensal: number
) {
  const db = await getDb();
  if (!db) return;

  const [ano, mesNum] = mes.split("-").map(Number);
  const ultimoDia = new Date(ano, mesNum, 0).getDate();

  // Contar dias úteis do mês
  let diasUteis = 0;
  for (let d = 1; d <= ultimoDia; d++) {
    const data = new Date(ano, mesNum - 1, d);
    const dia = data.getDay();
    if (dia !== 0 && dia !== 6) diasUteis++;
  }

  const metaDiaria = diasUteis > 0 ? metaMensal / diasUteis : 0;

  // Gerar metas para cada dia útil
  for (let d = 1; d <= ultimoDia; d++) {
    const data = new Date(ano, mesNum - 1, d);
    const dia = data.getDay();

    // Pula fins de semana
    if (dia === 0 || dia === 6) continue;

    const id = `meta_dia_${mes}_${d}_${vendedoraId}`;

    await db
      .insert(metasDiarias)
      .values({
        id,
        mes,
        dia: d,
        vendedoraId,
        metaValor: metaDiaria.toString(),
        tipo: "automatica",
      })
      .onDuplicateKeyUpdate({
        set: {
          metaValor: metaDiaria.toString(),
          tipo: "automatica",
        },
      });
  }
}

/**
 * Gera metas semanais automáticas para uma vendedora
 * Divide a meta mensal pelas semanas do mês
 */
export async function gerarMetasSemanais(
  mes: string,
  vendedoraId: string,
  metaMensal: number
) {
  const db = await getDb();
  if (!db) return;

  const [ano, mesNum] = mes.split("-").map(Number);
  const ultimoDia = new Date(ano, mesNum, 0).getDate();

  // Contar semanas com dias úteis
  const semanas = Math.ceil(ultimoDia / 7);
  let diasUteisPorSemana: number[] = [];

  for (let s = 1; s <= semanas; s++) {
    const { diaInicio, diaFim } = obterIntervaloSemana(mes, s);
    let diasUteis = 0;

    for (let d = diaInicio; d <= diaFim; d++) {
      const data = new Date(ano, mesNum - 1, d);
      const dia = data.getDay();
      if (dia !== 0 && dia !== 6) diasUteis++;
    }

    diasUteisPorSemana.push(diasUteis);
  }

  const totalDiasUteis = diasUteisPorSemana.reduce((a, b) => a + b, 0);

  // Gerar metas para cada semana
  for (let s = 1; s <= semanas; s++) {
    const diasUteis = diasUteisPorSemana[s - 1];
    const metaSemanal = totalDiasUteis > 0 ? (metaMensal * diasUteis) / totalDiasUteis : 0;

    const id = `meta_sem_${mes}_${s}_${vendedoraId}`;

    await db
      .insert(metasSemanais)
      .values({
        id,
        mes,
        semana: s,
        vendedoraId,
        metaValor: metaSemanal.toString(),
        tipo: "automatica",
      })
      .onDuplicateKeyUpdate({
        set: {
          metaValor: metaSemanal.toString(),
          tipo: "automatica",
        },
      });
  }
}

/**
 * Atualiza meta diária manualmente
 */
export async function atualizarMetaDiaria(
  mes: string,
  dia: number,
  vendedoraId: string,
  novaMetaValor: number
) {
  const db = await getDb();
  if (!db) return;

  const id = `meta_dia_${mes}_${dia}_${vendedoraId}`;

  await db
    .insert(metasDiarias)
    .values({
      id,
      mes,
      dia,
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
 * Atualiza meta semanal manualmente
 */
export async function atualizarMetaSemanal(
  mes: string,
  semana: number,
  vendedoraId: string,
  novaMetaValor: number
) {
  const db = await getDb();
  if (!db) return;

  const id = `meta_sem_${mes}_${semana}_${vendedoraId}`;

  await db
    .insert(metasSemanais)
    .values({
      id,
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
 * Obtém metas diárias de uma vendedora no mês
 */
export async function obterMetasDiarias(mes: string, vendedoraId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(metasDiarias)
    .where(and(eq(metasDiarias.mes, mes), eq(metasDiarias.vendedoraId, vendedoraId)))
    .orderBy(metasDiarias.dia);
}

/**
 * Obtém metas semanais de uma vendedora no mês
 */
export async function obterMetasSemanais(mes: string, vendedoraId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(metasSemanais)
    .where(and(eq(metasSemanais.mes, mes), eq(metasSemanais.vendedoraId, vendedoraId)))
    .orderBy(metasSemanais.semana);
}

/**
 * Regenera todas as metas diárias/semanais para um mês
 * Útil quando a meta mensal é alterada
 */
export async function regenerarMetasDoMes(mes: string) {
  const db = await getDb();
  if (!db) return;

  // Buscar todas as metas mensais do mês
  const metasDoMes = await db
    .select()
    .from(metasVendedor)
    .where(eq(metasVendedor.mes, mes));

  // Regenerar para cada vendedora
  for (const meta of metasDoMes) {
    const metaValor = parseFloat(meta.metaValor);
    await gerarMetasDiarias(mes, meta.vendedoraId, metaValor);
    await gerarMetasSemanais(mes, meta.vendedoraId, metaValor);
  }
}
