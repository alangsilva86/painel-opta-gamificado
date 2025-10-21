interface ZohoTokenResponse {
  access_token: string;
  expires_in: number;
  api_domain: string;
  token_type: string;
}

interface ZohoContratoRaw {
  ID: string;
  contractNumber?: string;
  paymentDate?: string; // dd/mm/yyyy
  typeDate?: string; // dd/mm/yyyy
  amount?: string; // valor líquido
  sellerName?: { name: string; ID: string; zc_display_value: string };
  typerName?: { name: string; ID: string; zc_display_value: string };
  product?: { name: string; ID: string; zc_display_value: string };
  operationType?: { operation_type_name: string; ID: string; zc_display_value: string };
  agentId?: { name: string; ID: string; zc_display_value: string };
  "Blueprint.Current_Stage"?: { ID: string; zc_display_value: string };
}

export interface ZohoContrato {
  ID: string;
  Numero_do_Contrato: string;
  Data_de_Pagamento: string; // yyyy-mm-dd
  Valor_liquido_liberado: number;
  Valor_comissao: number; // Calculado: amount * 0.08 (estimativa)
  Vendedor: { display_value: string; ID: string };
  Produto: { display_value: string; ID: string };
  Corban: { display_value: string; ID: string };
  Metadata_Cancelado: string | null;
}

interface ZohoDataResponse {
  data: ZohoContratoRaw[];
  record_cursor?: string;
}

class ZohoService {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.clientId = process.env.ZOHO_CLIENT_ID || "";
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET || "";
    this.refreshToken = process.env.ZOHO_REFRESH_TOKEN || "";

    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      console.warn(
        "[ZohoService] Missing credentials. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN"
      );
    }
  }

  /**
   * Obtém um access token válido, renovando se necessário
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    // Se já temos um token válido, retorna
    if (this.accessToken && now < this.tokenExpiry) {
      return this.accessToken;
    }

    // Renova o token
    try {
      const params = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
      });

      const response = await fetch(
        "https://accounts.zoho.com/oauth/v2/token",
        { 
          method: "POST",
          body: params,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ZohoService] Erro na resposta:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data: ZohoTokenResponse = await response.json();

      this.accessToken = data.access_token;
      // Define expiração com margem de segurança de 5 minutos
      this.tokenExpiry = now + (data.expires_in - 300) * 1000;

      console.log("[ZohoService] Access token renovado com sucesso");
      return this.accessToken;
    } catch (error) {
      console.error("[ZohoService] Erro ao renovar access token:", error);
      throw new Error("Falha ao autenticar com Zoho Creator");
    }
  }

  /**
   * Converte data dd/mm/yyyy para yyyy-mm-dd
   */
  private converterData(dataBr: string): string {
    if (!dataBr) return "";
    const partes = dataBr.split("/");
    if (partes.length !== 3) return "";
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
  }

  /**
   * Transforma contrato raw do Zoho para formato esperado
   */
  private transformarContrato(raw: ZohoContratoRaw): ZohoContrato | null {
    // Ignora contratos sem data de pagamento
    if (!raw.paymentDate) return null;

    const valorLiquido = parseFloat(raw.amount || "0");
    // Estimativa: comissão = 8% do valor líquido
    const valorComissao = valorLiquido * 0.08;

    return {
      ID: raw.ID,
      Numero_do_Contrato: raw.contractNumber || "",
      Data_de_Pagamento: this.converterData(raw.paymentDate),
      Valor_liquido_liberado: valorLiquido,
      Valor_comissao: valorComissao,
      Vendedor: {
        display_value: raw.sellerName?.name || "Sem vendedor",
        ID: raw.sellerName?.ID || "",
      },
      Produto: {
        display_value: raw.product?.name || "Sem produto",
        ID: raw.product?.ID || "",
      },
      Corban: {
        display_value: raw.agentId?.name || "Sem corban",
        ID: raw.agentId?.ID || "",
      },
      Metadata_Cancelado: null, // Já filtramos cancelados na query
    };
  }

  /**
   * Busca contratos do Zoho Creator
   */
  async buscarContratos(params: {
    mesInicio: string; // yyyy-mm-dd
    mesFim: string; // yyyy-mm-dd
    maxRecords?: 200 | 500 | 1000;
  }): Promise<ZohoContrato[]> {
    const token = await this.getAccessToken();
    const { mesInicio, mesFim, maxRecords = 1000 } = params;

    // Converte datas para formato dd/mm/yyyy
    const [anoIni, mesIni, diaIni] = mesInicio.split("-");
    const [anoFim, mesFim2, diaFim] = mesFim.split("-");
    const dataInicioBr = `${diaIni}/${mesIni}/${anoIni}`;
    const dataFimBr = `${diaFim}/${mesFim2}/${anoFim}`;

    // Monta o critério de filtro
    const criteria = `paymentDate >= '${dataInicioBr}' && paymentDate <= '${dataFimBr}'`;

    let allData: ZohoContratoRaw[] = [];
    let cursor: string | undefined = undefined;

    try {
      // Loop de paginação
      do {
        const params = new URLSearchParams({
          max_records: maxRecords.toString(),
          criteria,
        });

        if (cursor) {
          params.append("record_cursor", cursor);
        }

        const url = `https://www.zohoapis.com/creator/v2.1/data/optacredito/opta-operation/report/Contratos?${params.toString()}`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("[ZohoService] Erro ao buscar contratos:", errorData);
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
        }

        const data: ZohoDataResponse = await response.json();

        if (data.data && data.data.length > 0) {
          allData = allData.concat(data.data);
        }

        cursor = data.record_cursor;
      } while (cursor);

      // Transforma contratos
      const contratosTransformados = allData
        .map((raw) => this.transformarContrato(raw))
        .filter((c): c is ZohoContrato => c !== null);

      console.log(
        `[ZohoService] ${contratosTransformados.length} contratos encontrados (${allData.length} raw)`
      );
      return contratosTransformados;
    } catch (error: any) {
      console.error("[ZohoService] Erro ao buscar contratos:", error.message);
      throw new Error("Falha ao buscar contratos do Zoho Creator");
    }
  }

  /**
   * Busca contratos do mês atual
   */
  async buscarContratosMesAtual(): Promise<ZohoContrato[]> {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, "0");

    // Primeiro e último dia do mês
    const mesInicio = `${ano}-${mes}-01`;
    const ultimoDia = new Date(ano, now.getMonth() + 1, 0).getDate();
    const mesFim = `${ano}-${mes}-${String(ultimoDia).padStart(2, "0")}`;

    return this.buscarContratos({ mesInicio, mesFim });
  }

  /**
   * Busca contratos do mês anterior
   */
  async buscarContratosMesAnterior(): Promise<ZohoContrato[]> {
    const now = new Date();
    const mesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ano = mesAnterior.getFullYear();
    const mes = String(mesAnterior.getMonth() + 1).padStart(2, "0");

    const mesInicio = `${ano}-${mes}-01`;
    const ultimoDia = new Date(ano, mesAnterior.getMonth() + 1, 0).getDate();
    const mesFim = `${ano}-${mes}-${String(ultimoDia).padStart(2, "0")}`;

    return this.buscarContratos({ mesInicio, mesFim });
  }
}

// Singleton
export const zohoService = new ZohoService();

