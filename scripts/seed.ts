import { drizzle } from "drizzle-orm/mysql2";
import { vendedoras, metasVendedor, metasGlobal } from "../drizzle/schema";

async function seed() {
  const db = drizzle(process.env.DATABASE_URL!);

  console.log("🌱 Iniciando seed do banco de dados...");

  // Limpa dados existentes
  console.log("Limpando dados existentes...");
  await db.delete(metasVendedor);
  await db.delete(metasGlobal);
  await db.delete(vendedoras);

  // Cria vendedoras
  console.log("Criando vendedoras...");
  const vendedorasData = [
    {
      id: "vend_001",
      nome: "Ana Silva",
      email: "ana.silva@opta.com.br",
      foto: null,
      ativo: "sim" as const,
    },
    {
      id: "vend_002",
      nome: "Beatriz Costa",
      email: "beatriz.costa@opta.com.br",
      foto: null,
      ativo: "sim" as const,
    },
    {
      id: "vend_003",
      nome: "Carla Santos",
      email: "carla.santos@opta.com.br",
      foto: null,
      ativo: "sim" as const,
    },
    {
      id: "vend_004",
      nome: "Daniela Oliveira",
      email: "daniela.oliveira@opta.com.br",
      foto: null,
      ativo: "sim" as const,
    },
    {
      id: "vend_005",
      nome: "Elaine Ferreira",
      email: "elaine.ferreira@opta.com.br",
      foto: null,
      ativo: "sim" as const,
    },
    {
      id: "vend_006",
      nome: "Fernanda Lima",
      email: "fernanda.lima@opta.com.br",
      foto: null,
      ativo: "sim" as const,
    },
  ];

  for (const vendedora of vendedorasData) {
    await db.insert(vendedoras).values(vendedora);
  }

  console.log(`✅ ${vendedorasData.length} vendedoras criadas`);

  // Define mês atual
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Cria metas individuais
  console.log("Criando metas individuais...");
  const metasData = [
    { vendedoraId: "vend_001", metaValor: "100000" },
    { vendedoraId: "vend_002", metaValor: "120000" },
    { vendedoraId: "vend_003", metaValor: "90000" },
    { vendedoraId: "vend_004", metaValor: "110000" },
    { vendedoraId: "vend_005", metaValor: "95000" },
    { vendedoraId: "vend_006", metaValor: "105000" },
  ];

  for (const meta of metasData) {
    await db.insert(metasVendedor).values({
      id: `meta_${meta.vendedoraId}_${mesAtual}`,
      mes: mesAtual,
      vendedoraId: meta.vendedoraId,
      metaValor: meta.metaValor,
    });
  }

  console.log(`✅ ${metasData.length} metas individuais criadas`);

  // Cria meta global
  console.log("Criando meta global...");
  await db.insert(metasGlobal).values({
    id: `meta_global_${mesAtual}`,
    mes: mesAtual,
    metaValor: "620000", // Soma das metas individuais
  });

  console.log("✅ Meta global criada");

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("\n📝 Dados criados:");
  console.log(`   - ${vendedorasData.length} vendedoras`);
  console.log(`   - ${metasData.length} metas individuais`);
  console.log(`   - 1 meta global`);
  console.log(`   - Mês: ${mesAtual}`);
  console.log("\n⚠️  Nota: Os contratos virão do Zoho Creator em tempo real");

  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Erro ao executar seed:", error);
  process.exit(1);
});

