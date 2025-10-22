import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import {
  vendedoras,
  metasVendedor,
  metasGlobal,
  badges,
  historicoMetas,
  Vendedora,
  InsertVendedora,
  InsertMetaVendedor,
  InsertMetaGlobal,
  InsertBadge,
  InsertHistoricoMeta,
} from "../drizzle/schema";

/**
 * Helpers para vendedoras
 */
export async function listarVendedoras() {
  const db = await getDb();
  if (!db) return [];
  // Retorna apenas vendedoras ativas E visíveis
  return db
    .select()
    .from(vendedoras)
    .where(and(eq(vendedoras.ativo, "sim"), eq(vendedoras.visivel, "sim")));
}

export async function obterVendedora(id: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(vendedoras).where(eq(vendedoras.id, id)).limit(1);
  return result[0] || null;
}

export async function criarVendedora(data: InsertVendedora) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(vendedoras).values(data);
}

export async function atualizarVendedora(id: string, data: Partial<InsertVendedora>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(vendedoras).set(data).where(eq(vendedoras.id, id));
}

/**
 * Helpers para metas de vendedor
 */
export async function obterMetaVendedor(vendedoraId: string, mes: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(metasVendedor)
    .where(and(eq(metasVendedor.vendedoraId, vendedoraId), eq(metasVendedor.mes, mes)))
    .limit(1);
  return result[0] || null;
}

export async function listarMetasVendedorPorMes(mes: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(metasVendedor).where(eq(metasVendedor.mes, mes));
}

export async function criarOuAtualizarMetaVendedor(
  data: InsertMetaVendedor,
  userId: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existente = await obterMetaVendedor(data.vendedoraId, data.mes);

  if (existente) {
    // Registra no histórico
    await registrarHistoricoMeta({
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tipo: "vendedor",
      mes: data.mes,
      vendedoraId: data.vendedoraId,
      valorAnterior: existente.metaValor,
      valorNovo: data.metaValor,
      alteradoPor: userId,
    });

    // Atualiza
    await db
      .update(metasVendedor)
      .set({ metaValor: data.metaValor, updatedAt: new Date() })
      .where(eq(metasVendedor.id, existente.id));
  } else {
    // Cria nova
    await db.insert(metasVendedor).values(data);

    // Registra no histórico
    await registrarHistoricoMeta({
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tipo: "vendedor",
      mes: data.mes,
      vendedoraId: data.vendedoraId,
      valorAnterior: null,
      valorNovo: data.metaValor,
      alteradoPor: userId,
    });
  }
}

/**
 * Helpers para meta global
 */
export async function obterMetaGlobal(mes: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(metasGlobal)
    .where(eq(metasGlobal.mes, mes))
    .limit(1);
  return result[0] || null;
}

export async function criarOuAtualizarMetaGlobal(
  data: InsertMetaGlobal,
  userId: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existente = await obterMetaGlobal(data.mes);

  if (existente) {
    // Registra no histórico
    await registrarHistoricoMeta({
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tipo: "global",
      mes: data.mes,
      vendedoraId: null,
      valorAnterior: existente.metaValor,
      valorNovo: data.metaValor,
      alteradoPor: userId,
    });

    // Atualiza
    await db
      .update(metasGlobal)
      .set({ metaValor: data.metaValor, updatedAt: new Date() })
      .where(eq(metasGlobal.id, existente.id));
  } else {
    // Cria nova
    await db.insert(metasGlobal).values(data);

    // Registra no histórico
    await registrarHistoricoMeta({
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tipo: "global",
      mes: data.mes,
      vendedoraId: null,
      valorAnterior: null,
      valorNovo: data.metaValor,
      alteradoPor: userId,
    });
  }
}

/**
 * Helpers para badges
 */
export async function listarBadgesVendedora(vendedoraId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(badges).where(eq(badges.vendedoraId, vendedoraId));
}

export async function criarBadge(data: InsertBadge) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(badges).values(data);
}

/**
 * Helpers para histórico de metas
 */
export async function listarHistoricoMetas(mes: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(historicoMetas).where(eq(historicoMetas.mes, mes));
}

export async function registrarHistoricoMeta(data: InsertHistoricoMeta) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(historicoMetas).values(data);
}

/**
 * Utilitário: obter mês atual no formato YYYY-MM
 */
export function obterMesAtual(): string {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

/**
 * Utilitário: obter mês anterior no formato YYYY-MM
 */
export function obterMesAnterior(): string {
  const now = new Date();
  const mesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const ano = mesAnterior.getFullYear();
  const mes = String(mesAnterior.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}



/**
 * Sincroniza vendedoras do Zoho para o banco de dados
 */
export async function sincronizarVendedorasDoZoho(contratosZoho: any[]) {
  const db = await getDb();
  if (!db) return;

  // Extrai vendedoras únicas dos contratos
  const vendedorasMap = new Map<string, { id: string; nome: string }>();

  contratosZoho.forEach((contrato) => {
    if (contrato.Vendedor && contrato.Vendedor.ID && contrato.Vendedor.display_value) {
      vendedorasMap.set(contrato.Vendedor.ID, {
        id: contrato.Vendedor.ID,
        nome: contrato.Vendedor.display_value,
      });
    }
  });

  // Insere ou atualiza vendedoras no banco
  for (const id of Array.from(vendedorasMap.keys())) {
    const vendedora = vendedorasMap.get(id)!;
    const existente = await obterVendedora(id);

    if (!existente) {
      // Cria nova vendedora
      await db.insert(vendedoras).values({
        id: vendedora.id,
        nome: vendedora.nome,
        email: null,
        foto: null,
        ativo: "sim",
      });
      console.log(`[sincronizarVendedoras] Nova vendedora criada: ${vendedora.nome}`);
    } else if (existente.nome !== vendedora.nome) {
      // Atualiza nome se mudou
      await db.update(vendedoras).set({ nome: vendedora.nome }).where(eq(vendedoras.id, id));
      console.log(`[sincronizarVendedoras] Vendedora atualizada: ${vendedora.nome}`);
    }
  }

  console.log(`[sincronizarVendedoras] ${vendedorasMap.size} vendedoras sincronizadas`);
}



/**
 * Alterna visibilidade de uma vendedora no dashboard
 */
export async function alternarVisibilidadeVendedora(
  vendedoraId: string,
  visivel: "sim" | "nao"
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  await db.update(vendedoras).set({ visivel }).where(eq(vendedoras.id, vendedoraId));

  console.log(`[alternarVisibilidade] Vendedora ${vendedoraId} agora está ${visivel === "sim" ? "visível" : "oculta"}`);
}

/**
 * Lista todas as vendedoras (incluindo ocultas) para administração
 */
export async function listarTodasVendedoras(): Promise<Vendedora[]> {
  const db = await getDb();
  if (!db) return [];

  const resultado = await db.select().from(vendedoras).orderBy(vendedoras.nome);
  return resultado;
}

