import type { HistoryTimeframe } from '@shapeshiftoss/types'
import { getHistoryTimeframeBounds } from '@shapeshiftoss/utils'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

const baseCurrency = 'USD'

export const SupportedFiatCurrenciesList = [
  'CNY',
  'USD',
  'EUR',
  'JPY',
  'GBP',
  'KRW',
  'INR',
  'CAD',
  'HKD',
  'AUD',
  'TWD',
  'BRL',
  'CHF',
  'THB',
  'MXN',
  'RUB',
  'SAR',
  'SGD',
  'ILS',
  'IDR',
] as const

export type SupportedFiatCurrency = (typeof SupportedFiatCurrenciesList)[number]

export type FiatMarketData = {
  symbol: string
  price: string
  marketCap: string
  volume: string
  changePercent24Hr: number
}

export type FiatPriceHistoryPoint = {
  date: number
  price: number
}

type ExchangeRateHostRate = {
  quotes: {
    [k: string]: number
  }
}

type ExchangeRateHostHistoryData = {
  source: string
  quotes: {
    [k: string]: {
      [j: string]: number
    }
  }
}

const cache = new Map<string, { data: unknown; expires: number }>()
const CACHE_TTL_MS = 60_000

function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.data as T
  }
  cache.delete(key)
  return null
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS })
}

function getBaseUrlAndApiKey(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.EXCHANGERATEHOST_BASE_URL
  const apiKey = process.env.EXCHANGERATEHOST_API_KEY

  if (!baseUrl || !apiKey) {
    throw new Error('EXCHANGERATEHOST_BASE_URL and EXCHANGERATEHOST_API_KEY must be set')
  }

  return { baseUrl, apiKey }
}

function makeExchangeRateRequestUrls(
  start: Dayjs,
  end: Dayjs,
  symbol: string,
  baseUrl: string,
  apiKey: string,
): string[] {
  const daysBetween = end.diff(start, 'day')
  const maxDaysPerRequest = 366

  return Array(Math.ceil(daysBetween / maxDaysPerRequest))
    .fill(null)
    .map((_, i) => {
      const urlStart = start.add(i * maxDaysPerRequest, 'day')
      const maybeEnd = urlStart.add(maxDaysPerRequest - 1, 'day')
      const urlEnd = maybeEnd.isAfter(end) ? end : maybeEnd
      return `${baseUrl}/timeframe?access_key=${apiKey}&source=${baseCurrency}&currencies=${symbol}&start_date=${urlStart.format(
        'YYYY-MM-DD',
      )}&end_date=${urlEnd.format('YYYY-MM-DD')}`
    })
}

export async function getFiatMarketData(symbol: string): Promise<FiatMarketData | null> {
  if (symbol === 'USD') {
    return {
      symbol: 'USD',
      price: '1',
      marketCap: '0',
      volume: '0',
      changePercent24Hr: 0,
    }
  }

  const cacheKey = `fiat:${symbol}`
  const cached = getCached<FiatMarketData>(cacheKey)
  if (cached) {
    console.log(`[FiatService] Returning cached data for ${symbol}`)
    return cached
  }

  console.log(`[FiatService] Fetching market data for ${symbol}`)

  try {
    const { baseUrl, apiKey } = getBaseUrlAndApiKey()
    const url = `${baseUrl}/live?access_key=${apiKey}&source=${baseCurrency}&currencies=${symbol}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`ExchangeRateHost API error: ${response.status}`)
    }

    const data = (await response.json()) as ExchangeRateHostRate
    const rate = data.quotes[baseCurrency + symbol]

    if (!rate) {
      console.warn(`[FiatService] No rate found for ${symbol}`)
      return null
    }

    const result: FiatMarketData = {
      symbol,
      price: rate.toString(),
      marketCap: '0',
      volume: '0',
      changePercent24Hr: 0,
    }

    setCache(cacheKey, result)
    return result
  } catch (error) {
    console.error(`[FiatService] Error fetching market data for ${symbol}:`, error)
    return null
  }
}

export async function getFiatPriceHistory(
  symbol: string,
  timeframe: HistoryTimeframe,
): Promise<FiatPriceHistoryPoint[]> {
  if (symbol === 'USD') {
    return [{ date: 0, price: 1 }]
  }

  const cacheKey = `fiatHistory:${symbol}:${timeframe}`
  const cached = getCached<FiatPriceHistoryPoint[]>(cacheKey)
  if (cached) {
    console.log(`[FiatService] Returning cached price history for ${symbol}:${timeframe}`)
    return cached
  }

  console.log(`[FiatService] Fetching price history for ${symbol}:${timeframe}`)

  try {
    const { baseUrl, apiKey } = getBaseUrlAndApiKey()
    const { start, end } = getHistoryTimeframeBounds(timeframe)
    const urls = makeExchangeRateRequestUrls(start, end, symbol, baseUrl, apiKey)

    const results = await Promise.all(
      urls.map(async url => {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`ExchangeRateHost API error: ${response.status}`)
        }
        return response.json() as Promise<ExchangeRateHostHistoryData>
      }),
    )

    const historyData: FiatPriceHistoryPoint[] = []

    for (const data of results) {
      for (const [formattedDate, ratesObject] of Object.entries(data.quotes)) {
        const date = dayjs(formattedDate, 'YYYY-MM-DD').startOf('day').valueOf()
        const price = Number(ratesObject[data.source + symbol]) || 0
        if (price > 0) {
          historyData.push({ date, price })
        }
      }
    }

    historyData.sort((a, b) => a.date - b.date)
    setCache(cacheKey, historyData)
    return historyData
  } catch (error) {
    console.error(`[FiatService] Error fetching price history for ${symbol}:`, error)
    return []
  }
}

export function isSupportedFiatCurrency(symbol: string): symbol is SupportedFiatCurrency {
  return SupportedFiatCurrenciesList.includes(symbol as SupportedFiatCurrency)
}
