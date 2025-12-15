interface ZohoTokenResponse {
  access_token: string;
  expires_in: number;
  api_domain: string;
  token_type: string;
}

export interface ZohoContratoRaw {
  ID: string;
  contractNumber?: string;
  paymentDate?: string; // dd/mm/yyyy
  Data_de_Pagamento?: string; // fallback
  typeDate?: string; // dd/mm/yyyy
  amount?: string; // valor líquido liberado (NÃO usado para comissão)
  Valor_liquido_liberado?: string | number; // campo com nome completo
  Valor_comissao?: string; // CAMPO CRÍTICO: comissão da Opta (base do cálculo) - pode vir vazio
  Comissao?: string; // campo alternativo
  Comissao_Bonus?: string; // campo alternativo
  amountComission?: string; // campo que chega no payload do Zoho
  comissionPercent?: string; // percentual de comissão
  comissionPercentBonus?: string; // percentual de bônus
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
  Valor_liquido_liberado: number; // Valor do empréstimo (NÃO entra no cálculo de comissão)
  Valor_comissao_opta: number; // Comissão da Opta (vinda do Zoho) - NÃO EXIBIR
  Base_comissionavel_vendedores: number; // Valor_comissao_opta * 0.55 * 0.06
  Vendedor: { display_value: string; ID: string };
  Produto: { display_value: string; ID: string };
  Corban: { display_value: string; ID: string };
  Estagio: { display_value: string; ID: string }; // Blueprint.Current_Stage
}

interface ZohoDataResponse {
  data: ZohoContratoRaw[];
  record_cursor?: string;
}

function parseMoney(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;

  const trimmed = value.trim();
  if (!trimmed) return 0;

  // Remove prefixo de moeda e espaços
  let normalized = trimmed.replace(/[R$\s]/gi, "");

  // Se tiver vírgula como decimal, troca por ponto
  // Remove pontos de milhar (ponto seguido de 3 dígitos)
  normalized = normalized.replace(/\.(?=\d{3}(\D|$))/g, "");
  normalized = normalized.replace(",", ".");

  const result = parseFloat(normalized);
  return isNaN(result) ? 0 : result;
}

function parsePercent(value: unknown): number {
  // Percentual pode vir como "4.2000" ou "4,2". Reaproveita a lógica de moeda.
  return parseMoney(value);
}

function firstNumber(...values: Array<unknown>): number {
  for (const v of values) {
    const n = parseMoney(v);
    if (n !== 0) return n;
  }
  return 0;
}

class ZohoService {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 1200; // 1.2s entre requisições (50 req/min)

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
   * Aguarda para respeitar rate limit (50 req/min)
   */
  private async respeitarRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Executa requisição com retry e backoff exponencial
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 3
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.respeitarRateLimit();

        const response = await fetch(url, options);

        // Se receber 429 (Too Many Requests), aguarda e tenta novamente
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;

          console.warn(
            `[ZohoService] Rate limit atingido (429). Aguardando ${waitTime}ms antes de tentar novamente...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        return response;
      } catch (error: any) {
        lastError = error;
        console.warn(`[ZohoService] Tentativa ${attempt + 1}/${maxRetries} falhou:`, error.message);

        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error("Falha após múltiplas tentativas");
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

      const response = await this.fetchWithRetry(
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
   * REGRA CRÍTICA: Usa Valor_comissao do Zoho, NÃO o amount
   */
  private transformarContrato(raw: ZohoContratoRaw): ZohoContrato | null {
    // Data de pagamento: aceita paymentDate ou Data_de_Pagamento (iso ou dd/mm/yyyy)
    const dataPagamentoBr = raw.Data_de_Pagamento || raw.paymentDate;
    if (!dataPagamentoBr) return null;
    const dataPagamento = this.converterData(dataPagamentoBr) || dataPagamentoBr;

    const valorLiquido = firstNumber(
      raw.Valor_liquido_liberado,
      raw.amount
    );

    // Calcula comissão:
    // 1) Se existir amountComission (Zoho), usa.
    // 2) Senão, tenta Valor_comissao/Comissao.
    // 3) Se ainda zero, calcula por percentual * valor líquido.
    const comissaoPercent = parsePercent(raw.comissionPercent);
    const comissaoPercentBonus = parsePercent(raw.comissionPercentBonus);
    const comissaoPercentTotal = comissaoPercent + comissaoPercentBonus;
    const comissaoCalculadaPorPercentual = valorLiquido * (comissaoPercentTotal / 100);

    const comissaoPrincipal = firstNumber(
      raw.amountComission,
      raw.Valor_comissao,
      raw.Comissao,
      comissaoCalculadaPorPercentual
    );
    const comissaoBonus = parseMoney(raw.Comissao_Bonus);
    let valorComissaoOpta = comissaoPrincipal + comissaoBonus;
    
    // Cálculo oficial: Base Comissionável = Valor_comissao_opta * 0.55 * 0.06
    const baseComissionavelVendedores = valorComissaoOpta * 0.55 * 0.06;

    return {
      ID: raw.ID,
      Numero_do_Contrato: raw.contractNumber || "",
      Data_de_Pagamento: dataPagamento,
      Valor_liquido_liberado: valorLiquido,
      Valor_comissao_opta: valorComissaoOpta, // NÃO EXIBIR no painel
      Base_comissionavel_vendedores: baseComissionavelVendedores,
      Vendedor: {
        display_value: raw.sellerName?.zc_display_value || raw.sellerName?.name || "Sem vendedor",
        ID: raw.sellerName?.ID || "",
      },
      Produto: {
        display_value: raw.product?.zc_display_value || raw.product?.name || "Sem produto",
        ID: raw.product?.ID || "",
      },
      Corban: {
        display_value: raw.agentId?.zc_display_value || raw.agentId?.name || "Sem corban",
        ID: raw.agentId?.ID || "",
      },
      Estagio: {
        display_value: raw["Blueprint.Current_Stage"]?.zc_display_value || "Sem estágio",
        ID: raw["Blueprint.Current_Stage"]?.ID || "",
      },
    };
  }

  /**
   * Busca contratos do Zoho Creator
   */
  async buscarContratosRaw(params: {
    mesInicio: string; // yyyy-mm-dd
    mesFim: string; // yyyy-mm-dd
    maxRecords?: 200 | 500 | 1000;
  }): Promise<ZohoContratoRaw[]> {
    const token = await this.getAccessToken();
    const { mesInicio, mesFim, maxRecords = 1000 } = params;

    // Converte datas para formato dd/mm/yyyy
    const [anoIni, mesIni, diaIni] = mesInicio.split("-");
    const [anoFim, mesFim2, diaFim] = mesFim.split("-");
    const dataInicioBr = `${diaIni}/${mesIni}/${anoIni}`;
    const dataFimBr = `${diaFim}/${mesFim2}/${anoFim}`;

    // Monta o critério de filtro (range de pagamento). Cancelados são filtrados posteriormente via estágio.
    const criteria = `paymentDate >= '${dataInicioBr}' && paymentDate <= '${dataFimBr}'`;
    console.log(
      `[ZohoService] Critério: ${criteria} | range: ${mesInicio} -> ${mesFim} | max_records=${maxRecords}`
    );

    let allData: ZohoContratoRaw[] = [];
    let cursor: string | undefined = undefined;
    let pageCount = 0;
    let page = 1;
    const maxIterations = 500; // evita loop infinito

    try {
      // Loop de paginação
      while (pageCount < maxIterations) {
        pageCount++;
        console.log(
          `[ZohoService] Buscando página ${pageCount}${cursor ? " (cursor)" : ` (page=${page})`}...`
        );

        const urlParams = new URLSearchParams({
          max_records: maxRecords.toString(),
          criteria,
          field_config: "custom",
          fields: [
            "ID",
            "contractNumber",
            "paymentDate",
            "Data_de_Pagamento",
            "amount",
            "Valor_liquido_liberado",
            "Valor_comissao",
            "Comissao",
            "Comissao_Bonus",
            "amountComission",
            "comissionPercent",
            "comissionPercentBonus",
            "sellerName",
            "typerName",
            "product",
            "operationType",
            "agentId",
            "Blueprint.Current_Stage",
          ].join(","),
        });

        // fallback de paginação por page quando não há cursor
        if (!cursor && page > 1) {
          urlParams.set("page", page.toString());
        }

        const url = `https://www.zohoapis.com/creator/v2.1/data/optacredito/opta-operation/report/Contratos?${urlParams.toString()}`;

        const headers: Record<string, string> = {
          Authorization: `Zoho-oauthtoken ${token}`,
        };

        // record_cursor vai no HEADER, não no query param
        if (cursor) {
          headers["record_cursor"] = cursor;
        }

        const response = await this.fetchWithRetry(url, { headers });

        if (!response.ok) {
          let errorData: any = null;
          try {
            errorData = await response.json();
          } catch {
            // ignore JSON parse errors
          }

          if (response.status === 400 && errorData?.code === 9280) {
            console.warn(
              `[ZohoService] Sem registros para o critério informado (page=${page}, criteria=${criteria})`
            );
            break; // encerra paginação para este intervalo
          }

          console.error("[ZohoService] Erro ao buscar contratos:", errorData ?? response.statusText);
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData ?? {})}`);
        }

        const data: ZohoDataResponse = await response.json();
        const headerCursor = response.headers.get("record_cursor") || undefined;

        if (data.data && data.data.length > 0) {
          allData = allData.concat(data.data);
          console.log(`[ZohoService] Página ${pageCount}: ${data.data.length} registros`);
          if (!data.record_cursor && data.data.length >= maxRecords) {
            console.warn(
              `[ZohoService] ALERTA: record_cursor ausente em cenário paginado (page=${page}, batch=${data.data.length}, max_records=${maxRecords})`
            );
          }
        }

        const batchFull = (data.data?.length ?? 0) >= maxRecords;
        const cursorFromBody = data.record_cursor;
        cursor = headerCursor || cursorFromBody || undefined;
        if (cursor) {
          page += 1;
          continue;
        }

        if (batchFull) {
          // fallback: incrementa page quando não há cursor mas ainda há dados
          page += 1;
          continue;
        }

        break;
      }

      if (allData.length === 0) {
        console.warn(
          `[ZohoService] Nenhum contrato retornado pelo Zoho (raw=0). Verifique se há dados no intervalo e se o token tem escopo correto.`
        );
      }
      console.log(
        `[ZohoService] ✓ ${allData.length} contratos brutos encontrados em ${pageCount} páginas`
      );
      return allData;
    } catch (error: any) {
      console.error("[ZohoService] Erro ao buscar contratos:", error.message);
      throw new Error("Falha ao buscar contratos do Zoho Creator");
    }
  }

  /**
   * Busca contratos do Zoho Creator (formato usado no painel atual)
   */
  async buscarContratos(params: {
    mesInicio: string; // yyyy-mm-dd
    mesFim: string; // yyyy-mm-dd
    maxRecords?: 200 | 500 | 1000;
  }): Promise<ZohoContrato[]> {
    const allData = await this.buscarContratosRaw(params);

    // Transforma contratos
    const contratosTransformados = allData
      .map((raw) => this.transformarContrato(raw))
      .filter((c): c is ZohoContrato => c !== null);

    console.log(
      `[ZohoService] ✓ ${contratosTransformados.length} contratos transformados (${allData.length} raw)`
    );
    return contratosTransformados;
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
