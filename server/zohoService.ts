import {
  calcularBaseComissionavelVendedora,
  resolveZohoCommissionBreakdown,
} from "@shared/commercialRules";

interface ZohoTokenResponse {
  access_token: string;
  expires_in: number;
  api_domain: string;
  token_type: string;
}

type ZohoLookupValue =
  | string
  | {
      name?: string;
      ID?: string;
      zc_display_value?: string;
      operation_type_name?: string;
    };

export interface ZohoContratoRaw {
  ID: string;
  contractNumber?: string;
  Data_de_Criacao?: string; // dd/mm/yyyy
  Added_Time?: string; // dd/mm/yyyy HH:mm:ss
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
  sellerName?: ZohoLookupValue;
  typerName?: ZohoLookupValue;
  product?: ZohoLookupValue;
  operationType?: ZohoLookupValue;
  agentId?: ZohoLookupValue;
  "agentId.name"?: string;
  "Blueprint.Current_Stage"?: ZohoLookupValue;
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
  TipoOperacao: { display_value: string; ID: string };
}

interface ZohoDataResponse {
  data: ZohoContratoRaw[];
  record_cursor?: string;
}

const CONTRATOS_REPORT_URL =
  "https://www.zohoapis.com/creator/v2.1/data/optacredito/opta-operation/report/Contratos";

function formatarDataBrTimezone(
  data: Date,
  timeZone = "America/Sao_Paulo"
): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone,
  }).formatToParts(data);
  const get = (type: string) =>
    parts.find(part => part.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")}`;
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function lookupDisplay(
  value: ZohoLookupValue | undefined,
  fallback = "",
  alternates: unknown[] = []
): string {
  if (value && typeof value === "object") {
    const display =
      cleanText(value.zc_display_value) ||
      cleanText(value.name) ||
      cleanText(value.operation_type_name) ||
      cleanText(value.ID);
    if (display) return display;
  }

  const direct = cleanText(value);
  if (direct) return direct;

  for (const alternate of alternates) {
    const display = cleanText(alternate);
    if (display) return display;
  }

  return fallback;
}

function lookupId(value: ZohoLookupValue | undefined, fallback = ""): string {
  if (value && typeof value === "object") {
    return cleanText(value.ID) || fallback;
  }
  return fallback;
}

class ZohoService {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 1200; // 1.2s entre requisições (50 req/min)
  private cacheTtlMs: number;
  private contratosCache = new Map<
    string,
    { data: ZohoContratoRaw[]; expiresAt: number }
  >();

  constructor() {
    this.clientId = process.env.ZOHO_CLIENT_ID || "";
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET || "";
    this.refreshToken = process.env.ZOHO_REFRESH_TOKEN || "";
    const ttlEnv = Number(process.env.ZOHO_CACHE_TTL_MS);
    this.cacheTtlMs = Number.isFinite(ttlEnv) ? ttlEnv : 60_000;

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
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Executa requisição com retry e backoff exponencial
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 3,
    timeoutMs: number = 20_000
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.respeitarRateLimit();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        let response: Response;
        try {
          response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        // Se receber 429 (Too Many Requests), aguarda e tenta novamente
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const waitTime = retryAfter
            ? parseInt(retryAfter) * 1000
            : Math.pow(2, attempt) * 1000;

          console.warn(
            `[ZohoService] Rate limit atingido (429). Aguardando ${waitTime}ms antes de tentar novamente...`
          );
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        return response;
      } catch (error: any) {
        lastError = error;
        const motivo = error?.name === "AbortError" ? "timeout" : error.message;
        console.warn(
          `[ZohoService] Tentativa ${attempt + 1}/${maxRetries} falhou:`,
          motivo
        );

        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
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
    const dataPagamento =
      this.converterData(dataPagamentoBr) || dataPagamentoBr;

    const commissionBreakdown = resolveZohoCommissionBreakdown({
      valorLiquido: raw.Valor_liquido_liberado,
      valorLiquidoFallback: raw.amount,
      amountComission: raw.amountComission,
      valorComissao: raw.Valor_comissao,
      comissao: raw.Comissao,
      comissaoBonus: raw.Comissao_Bonus,
      comissionPercent: raw.comissionPercent,
      comissionPercentBonus: raw.comissionPercentBonus,
    });

    const valorLiquido = commissionBreakdown.liquidoLiberado;
    const valorComissaoOpta = commissionBreakdown.comissaoTotal;
    const baseComissionavelVendedores =
      calcularBaseComissionavelVendedora(valorComissaoOpta);

    return {
      ID: raw.ID,
      Numero_do_Contrato: raw.contractNumber || "",
      Data_de_Pagamento: dataPagamento,
      Valor_liquido_liberado: valorLiquido,
      Valor_comissao_opta: valorComissaoOpta, // NÃO EXIBIR no painel
      Base_comissionavel_vendedores: baseComissionavelVendedores,
      Vendedor: {
        display_value: lookupDisplay(raw.sellerName, "Sem vendedor"),
        ID: lookupId(raw.sellerName, lookupDisplay(raw.sellerName)),
      },
      Produto: {
        display_value: lookupDisplay(raw.product, "Sem produto"),
        ID: lookupId(raw.product),
      },
      Corban: {
        display_value: lookupDisplay(raw.agentId, "Sem corban", [
          raw["agentId.name"],
        ]),
        ID: lookupId(raw.agentId),
      },
      Estagio: {
        display_value: lookupDisplay(
          raw["Blueprint.Current_Stage"],
          "Sem estágio"
        ),
        ID: lookupId(raw["Blueprint.Current_Stage"]),
      },
      TipoOperacao: {
        display_value: lookupDisplay(raw.operationType),
        ID: lookupId(raw.operationType),
      },
    };
  }

  private async buscarContratosReportRaw(params: {
    criteria: string;
    fields: string[];
    maxRecords?: 200 | 500 | 1000;
    cacheKey: string;
  }): Promise<ZohoContratoRaw[]> {
    const { criteria, fields, maxRecords = 1000, cacheKey } = params;
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const token = await this.getAccessToken();
    console.log(
      `[ZohoService] Critério: ${criteria} | max_records=${maxRecords}`
    );

    let allData: ZohoContratoRaw[] = [];
    let cursor: string | undefined = undefined;
    let pageCount = 0;
    let page = 1;
    const maxIterations = 500; // evita loop infinito

    try {
      while (pageCount < maxIterations) {
        pageCount++;
        console.log(
          `[ZohoService] Buscando página ${pageCount}${cursor ? " (cursor)" : ` (page=${page})`}...`
        );

        const urlParams = new URLSearchParams({
          max_records: maxRecords.toString(),
          criteria,
          field_config: "custom",
          fields: fields.join(","),
        });

        if (!cursor && page > 1) {
          urlParams.set("page", page.toString());
        }

        const headers: Record<string, string> = {
          Authorization: `Zoho-oauthtoken ${token}`,
        };

        if (cursor) {
          headers["record_cursor"] = cursor;
        }

        const response = await this.fetchWithRetry(
          `${CONTRATOS_REPORT_URL}?${urlParams.toString()}`,
          { headers }
        );

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
            break;
          }

          console.error(
            "[ZohoService] Erro ao buscar contratos:",
            errorData ?? response.statusText
          );
          throw new Error(
            `HTTP ${response.status}: ${JSON.stringify(errorData ?? {})}`
          );
        }

        const data: ZohoDataResponse = await response.json();
        const headerCursor = response.headers.get("record_cursor") || undefined;

        if (data.data && data.data.length > 0) {
          allData = allData.concat(data.data);
          console.log(
            `[ZohoService] Página ${pageCount}: ${data.data.length} registros`
          );
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
          page += 1;
          continue;
        }

        break;
      }

      if (allData.length === 0) {
        console.warn(
          "[ZohoService] Nenhum contrato retornado pelo Zoho (raw=0). Verifique se há dados no intervalo e se o token tem escopo correto."
        );
      }
      console.log(
        `[ZohoService] ✓ ${allData.length} contratos brutos encontrados em ${pageCount} páginas`
      );
      this.setCache(cacheKey, allData);
      return allData;
    } catch (error: any) {
      console.error("[ZohoService] Erro ao buscar contratos:", error.message);
      throw new Error("Falha ao buscar contratos do Zoho Creator");
    }
  }

  /**
   * Busca contratos do Zoho Creator
   */
  async buscarContratosRaw(params: {
    mesInicio: string; // yyyy-mm-dd
    mesFim: string; // yyyy-mm-dd
    maxRecords?: 200 | 500 | 1000;
  }): Promise<ZohoContratoRaw[]> {
    const { mesInicio, mesFim, maxRecords = 1000 } = params;

    // Converte datas para formato dd/mm/yyyy
    const [anoIni, mesIni, diaIni] = mesInicio.split("-");
    const [anoFim, mesFim2, diaFim] = mesFim.split("-");
    const dataInicioBr = `${diaIni}/${mesIni}/${anoIni}`;
    const dataFimBr = `${diaFim}/${mesFim2}/${anoFim}`;

    // Monta o critério de filtro (range de pagamento). Cancelados são filtrados posteriormente via estágio.
    const criteria = `paymentDate >= '${dataInicioBr}' && paymentDate <= '${dataFimBr}'`;
    return this.buscarContratosReportRaw({
      criteria,
      maxRecords,
      cacheKey: JSON.stringify({
        tipo: "pagos",
        mesInicio,
        mesFim,
        maxRecords,
      }),
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
      ],
    });
  }

  async buscarContratosCriadosHojeRaw(params?: {
    dataReferencia?: Date;
    maxRecords?: 200 | 500 | 1000;
  }): Promise<ZohoContratoRaw[]> {
    const dataHojeBr = formatarDataBrTimezone(
      params?.dataReferencia ?? new Date()
    );
    const maxRecords = params?.maxRecords ?? 1000;
    const criteria = `Added_Time >= '${dataHojeBr} 00:00:00' && Added_Time <= '${dataHojeBr} 23:59:59'`;

    return this.buscarContratosReportRaw({
      criteria,
      maxRecords,
      cacheKey: JSON.stringify({
        tipo: "criados_hoje",
        dataHojeBr,
        maxRecords,
      }),
      fields: [
        "ID",
        "contractNumber",
        "Added_Time",
        "Data_de_Criacao",
        "typeDate",
        "amount",
        "Valor_liquido_liberado",
        "sellerName",
        "sellerName.email",
        "product",
        "operationType",
        "agentId",
        "agentId.name",
        "Blueprint.Current_Stage",
      ],
    });
  }

  private getCache(cacheKey: string): ZohoContratoRaw[] | null {
    if (this.cacheTtlMs <= 0) return null;
    const cached = this.contratosCache.get(cacheKey);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this.contratosCache.delete(cacheKey);
      return null;
    }
    return cached.data;
  }

  private setCache(cacheKey: string, data: ZohoContratoRaw[]): void {
    if (this.cacheTtlMs <= 0) return;
    this.contratosCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
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
      .map(raw => this.transformarContrato(raw))
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
