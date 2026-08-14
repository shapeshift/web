import type { AssetId, AssetsResponse, QuoteResponse, RatesResponse } from '../types'

const DEFAULT_API_BASE_URL = 'https://api.shapeshift.com'

export type ApiClientConfig = {
  baseUrl?: string
  partnerCode?: string
}

export type TradeAmountParams =
  | { sellAmountCryptoBaseUnit: string; buyAmountCryptoBaseUnit?: never }
  | { buyAmountCryptoBaseUnit: string; sellAmountCryptoBaseUnit?: never }

const getTradeAmount = (params: TradeAmountParams): Record<string, string> =>
  params.buyAmountCryptoBaseUnit !== undefined
    ? { buyAmountCryptoBaseUnit: params.buyAmountCryptoBaseUnit }
    : { sellAmountCryptoBaseUnit: params.sellAmountCryptoBaseUnit }

export const createApiClient = (config: ApiClientConfig = {}) => {
  const baseUrl = config.baseUrl ?? DEFAULT_API_BASE_URL

  const fetchWithConfig = async <T>(
    endpoint: string,
    params?: Record<string, string>,
    method: 'GET' | 'POST' = 'GET',
    timeoutMs = 30000,
  ): Promise<T> => {
    const url = new URL(`${baseUrl}${endpoint}`)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (config.partnerCode) {
      headers['x-partner-code'] = config.partnerCode
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const fetchOptions: RequestInit = {
      headers,
      method,
      signal: controller.signal,
    }

    if (method === 'GET' && params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    } else if (method === 'POST' && params) {
      fetchOptions.body = JSON.stringify(params)
    }

    const response = await fetch(url.toString(), fetchOptions).finally(() => {
      clearTimeout(timeoutId)
    })
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }
    return response.json() as Promise<T>
  }

  return {
    getAssets: () => fetchWithConfig<AssetsResponse>('/v1/assets'),

    getRates: (params: { sellAssetId: AssetId; buyAssetId: AssetId } & TradeAmountParams) =>
      fetchWithConfig<RatesResponse>('/v1/swap/rates', {
        sellAssetId: params.sellAssetId,
        buyAssetId: params.buyAssetId,
        ...getTradeAmount(params),
      }),

    getSwapStatus: (params: { quoteId: string; txHash?: string }) =>
      fetchWithConfig<Record<string, unknown>>('/v1/swap/status', {
        quoteId: params.quoteId,
        ...(params.txHash && { txHash: params.txHash }),
      }),

    getQuote: (
      params: {
        sellAssetId: AssetId
        buyAssetId: AssetId
        sendAddress: string
        receiveAddress: string
        swapperName: string
        slippageTolerancePercentageDecimal?: string
      } & TradeAmountParams,
    ) =>
      fetchWithConfig<QuoteResponse>(
        '/v1/swap/quote',
        {
          sellAssetId: params.sellAssetId,
          buyAssetId: params.buyAssetId,
          ...getTradeAmount(params),
          sendAddress: params.sendAddress,
          receiveAddress: params.receiveAddress,
          swapperName: params.swapperName,
          ...(params.slippageTolerancePercentageDecimal && {
            slippageTolerancePercentageDecimal: params.slippageTolerancePercentageDecimal,
          }),
        },
        'POST',
      ),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
