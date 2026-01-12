import type {
  RatesResponse,
  QuoteResponse,
  AssetsResponse,
  AssetId,
} from "../types";

const DEFAULT_API_BASE_URL = "https://api.shapeshift.com";

export type ApiClientConfig = {
  baseUrl?: string;
  apiKey?: string;
};

export const createApiClient = (config: ApiClientConfig = {}) => {
  const baseUrl = config.baseUrl ?? DEFAULT_API_BASE_URL;

  const fetchWithConfig = async <T>(
    endpoint: string,
    params?: Record<string, string>,
    method: "GET" | "POST" = "GET",
  ): Promise<T> => {
    const url = new URL(`${baseUrl}${endpoint}`);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.apiKey) {
      headers["x-api-key"] = config.apiKey;
    }

    const fetchOptions: RequestInit = { headers, method };

    if (method === "GET" && params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    } else if (method === "POST" && params) {
      fetchOptions.body = JSON.stringify(params);
    }

    const response = await fetch(url.toString(), fetchOptions);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  };

  return {
    getAssets: () => fetchWithConfig<AssetsResponse>("/v1/assets"),

    getRates: (params: {
      sellAssetId: AssetId;
      buyAssetId: AssetId;
      sellAmountCryptoBaseUnit: string;
    }) =>
      fetchWithConfig<RatesResponse>("/v1/swap/rates", {
        sellAssetId: params.sellAssetId,
        buyAssetId: params.buyAssetId,
        sellAmountCryptoBaseUnit: params.sellAmountCryptoBaseUnit,
      }),

    getQuote: (params: {
      sellAssetId: AssetId;
      buyAssetId: AssetId;
      sellAmountCryptoBaseUnit: string;
      sendAddress: string;
      receiveAddress: string;
      swapperName: string;
      slippageTolerancePercentageDecimal?: string;
    }) =>
      fetchWithConfig<QuoteResponse>(
        "/v1/swap/quote",
        {
          sellAssetId: params.sellAssetId,
          buyAssetId: params.buyAssetId,
          sellAmountCryptoBaseUnit: params.sellAmountCryptoBaseUnit,
          sendAddress: params.sendAddress,
          receiveAddress: params.receiveAddress,
          swapperName: params.swapperName,
          ...(params.slippageTolerancePercentageDecimal && {
            slippageTolerancePercentageDecimal:
              params.slippageTolerancePercentageDecimal,
          }),
        },
        "POST",
      ),
  };
};

export type ApiClient = ReturnType<typeof createApiClient>;
