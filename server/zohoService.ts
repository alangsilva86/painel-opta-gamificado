import axios from "axios";

interface ZohoTokenResponse {
  access_token: string;
  expires_in: number;
  api_domain: string;
  token_type: string;
}

interface ZohoContrato {
  ID: string;
  Numero_do_Contrato?: string;
  Status?: string;
  Data_de_Criacao?: string;
  Data_de_Pagamento?: string;
  Valor_liquido_liberado?: number;
  Valor_comissao?: number;
  Comissao?: number;
  Comissao_Bonus?: number;
  Vendedor?: { display_value: string; ID: string };
  Digitador?: { display_value: string; ID: string };
  Produto?: { display_value: string; ID: string };
  Tipo_de_Operacao?: { display_value: string; ID: string };
  Corban?: { display_value: string; ID: string };
  Metadata_Cancelado?: string | null;
}

interface ZohoDataResponse {
  data: ZohoContrato[];
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
      console.warn("[ZohoService] Missing credentials. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN");
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
      const response = await axios.post<ZohoTokenResponse>(
        "https://accounts.zoho.com/oauth/v2/token",
        null,
        {
          params: {
            grant_type: "refresh_token",
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: this.refreshToken,
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Define expiração com margem de segurança de 5 minutos
      this.tokenExpiry = now + (response.data.expires_in - 300) * 1000;

      console.log("[ZohoService] Access token renovado com sucesso");
      return this.accessToken;
    } catch (error) {
      console.error("[ZohoService] Erro ao renovar access token:", error);
      throw new Error("Falha ao autenticar com Zoho Creator");
    }
  }

  /**
   * Busca contratos do Zoho Creator com filtros
   */
  async buscarContratos(params: {
    mesInicio: string; // YYYY-MM-DD
    mesFim: string; // YYYY-MM-DD
    maxRecords?: number;
  }): Promise<ZohoContrato[]> {
    const token = await this.getAccessToken();
    const { mesInicio, mesFim, maxRecords = 1000 } = params;

    // Monta o critério de filtro
    const criteria = `Metadata_Cancelado IS NULL && Data_de_Pagamento >= '${mesInicio}' && Data_de_Pagamento <= '${mesFim}'`;

    const campos = [
      "ID",
      "Numero_do_Contrato",
      "Status",
      "Data_de_Criacao",
      "Data_de_Pagamento",
      "Valor_liquido_liberado",
      "Valor_comissao",
      "Comissao",
      "Comissao_Bonus",
      "Vendedor",
      "Digitador",
      "Produto",
      "Tipo_de_Operacao",
      "Corban",
    ];

    let allData: ZohoContrato[] = [];
    let cursor: string | undefined = undefined;

    try {
      // Loop de paginação
      do {
        const headers: Record<string, string> = {
          Authorization: `Zoho-oauthtoken ${token}`,
          Accept: "application/json",
        };

        if (cursor) {
          headers["record_cursor"] = cursor;
        }

        const response = await axios.get<ZohoDataResponse>(
          "https://www.zohoapis.com/creator/v2.1/data/optacredito/opta-operation/report/Contratos",
          {
            params: {
              max_records: maxRecords,
              criteria,
              field_config: "custom",
              fields: campos.join(","),
            },
            headers,
          }
        );

        if (response.data.data && response.data.data.length > 0) {
          allData = allData.concat(response.data.data);
        }

        cursor = response.data.record_cursor;
      } while (cursor);

      console.log(`[ZohoService] ${allData.length} contratos encontrados`);
      return allData;
    } catch (error) {
      console.error("[ZohoService] Erro ao buscar contratos:", error);
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

