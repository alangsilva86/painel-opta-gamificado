/**
 * Serviço de dados mock para demonstração
 * Gera contratos fictícios quando o Zoho não está disponível
 */

export interface MockContrato {
  ID: string;
  Numero_do_Contrato: string;
  Data_de_Pagamento: string;
  Valor_liquido_liberado: number;
  Valor_comissao_opta: number;
  Base_comissionavel_vendedores: number;
  Vendedor: { display_value: string; ID: string };
  Produto: { display_value: string; ID: string };
  Corban: { display_value: string; ID: string };
  Estagio: { display_value: string; ID: string };
}

const VENDEDORAS = [
  { id: "vend_001", nome: "Ana Silva" },
  { id: "vend_002", nome: "Beatriz Costa" },
  { id: "vend_003", nome: "Carla Santos" },
  { id: "vend_004", nome: "Daniela Oliveira" },
  { id: "vend_005", nome: "Elaine Ferreira" },
  { id: "vend_006", nome: "Fernanda Lima" },
];

const PRODUTOS = [
  "Empréstimo Consignado",
  "Cartão Consignado",
  "Refinanciamento",
  "Portabilidade",
];

const CORBANS = ["Corban A", "Corban B", "Corban C", "Corban D"];

/**
 * Gera contratos mock para o mês atual
 */
export function gerarContratosMock(): MockContrato[] {
  const contratos: MockContrato[] = [];
  const now = new Date();
  const ano = now.getFullYear();
  const mes = now.getMonth();

  // Gera entre 3 a 8 contratos por vendedora
  VENDEDORAS.forEach((vendedora) => {
    const numContratos = Math.floor(Math.random() * 6) + 3;

    for (let i = 0; i < numContratos; i++) {
      // Data aleatória no mês atual
      const dia = Math.floor(Math.random() * 28) + 1;
      const dataPagamento = new Date(ano, mes, dia);

      // Valor entre 5.000 e 50.000
      const valorLiquido = Math.floor(Math.random() * 45000) + 5000;
      
      // NOVA REGRA: Comissão da Opta (simulação: 8% do valor líquido)
      const valorComissaoOpta = valorLiquido * 0.08;
      
      // Base comissionável = Valor_comissao_opta * 0.55 * 0.06
      const baseComissionavelVendedores = valorComissaoOpta * 0.55 * 0.06;

      contratos.push({
        ID: `mock_${vendedora.id}_${i}`,
        Numero_do_Contrato: `${ano}${String(mes + 1).padStart(2, "0")}${String(
          dia
        ).padStart(2, "0")}-${i.toString().padStart(4, "0")}`,
        Data_de_Pagamento: dataPagamento.toISOString().split("T")[0],
        Valor_liquido_liberado: valorLiquido,
        Valor_comissao_opta: valorComissaoOpta,
        Base_comissionavel_vendedores: baseComissionavelVendedores,
        Vendedor: {
          display_value: vendedora.nome,
          ID: vendedora.id,
        },
        Produto: {
          display_value: PRODUTOS[Math.floor(Math.random() * PRODUTOS.length)],
          ID: `prod_${Math.floor(Math.random() * 100)}`,
        },
        Corban: {
          display_value: CORBANS[Math.floor(Math.random() * CORBANS.length)],
          ID: `corban_${Math.floor(Math.random() * 100)}`,
        },
        Estagio: {
          display_value: "Pago",
          ID: "estagio_pago",
        },
      });
    }
  });

  return contratos;
}

/**
 * Verifica se deve usar dados mock
 */
export function shouldUseMockData(): boolean {
  const hasZohoCredentials =
    process.env.ZOHO_CLIENT_ID &&
    process.env.ZOHO_CLIENT_SECRET &&
    process.env.ZOHO_REFRESH_TOKEN;

  // Usa mock se não tiver credenciais ou se estiver em modo demo
  return !hasZohoCredentials || process.env.DEMO_MODE === "true";
}
