import { zohoService } from "./zohoService";

async function testZoho() {
  console.log("=== Teste de Integração Zoho Creator ===\n");

  console.log("1. Verificando credenciais...");
  console.log("   ZOHO_CLIENT_ID:", process.env.ZOHO_CLIENT_ID ? "✓ Configurado" : "✗ Faltando");
  console.log("   ZOHO_CLIENT_SECRET:", process.env.ZOHO_CLIENT_SECRET ? "✓ Configurado" : "✗ Faltando");
  console.log("   ZOHO_REFRESH_TOKEN:", process.env.ZOHO_REFRESH_TOKEN ? "✓ Configurado" : "✗ Faltando");

  if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET || !process.env.ZOHO_REFRESH_TOKEN) {
    console.log("\n❌ Credenciais do Zoho não configuradas!");
    console.log("Configure as variáveis de ambiente antes de continuar.");
    return;
  }

  console.log("\n2. Testando busca de contratos...");
  try {
    const contratos = await zohoService.buscarContratosMesAtual();
    console.log(`✓ Sucesso! ${contratos.length} contratos encontrados`);

    if (contratos.length > 0) {
      console.log("\n3. Exemplo de contrato:");
      const exemplo = contratos[0];
      console.log("   ID:", exemplo.ID);
      console.log("   Número:", exemplo.Numero_do_Contrato);
      console.log("   Vendedor:", exemplo.Vendedor?.display_value);
      console.log("   Valor líquido:", exemplo.Valor_liquido_liberado);
      console.log("   Valor comissão:", exemplo.Valor_comissao);
      console.log("   Data pagamento:", exemplo.Data_de_Pagamento);

      console.log("\n4. Vendedoras únicas:");
      const vendedoras = new Set<string>();
      contratos.forEach((c) => {
        if (c.Vendedor?.display_value) {
          vendedoras.add(c.Vendedor.display_value);
        }
      });
      vendedoras.forEach((v) => console.log("   -", v));
    }

    console.log("\n✅ Integração Zoho funcionando corretamente!");
  } catch (error) {
    console.log("\n❌ Erro ao buscar contratos:");
    console.error(error);
  }
}

testZoho();

