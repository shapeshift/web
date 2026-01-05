import type { HistoryData, HistoryTimeframe, MarketData } from '@shapeshiftoss/types'
import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'

import type { SupportedFiatCurrencies } from '@/lib/market-service'

const GET_FIAT_RATE = gql`
  query GetFiatRate($symbol: String!) {
    market {
      fiatRate(symbol: $symbol) {
        symbol
        price
        marketCap
        volume
        changePercent24Hr
      }
    }
  }
`

const GET_FIAT_PRICE_HISTORY = gql`
  query GetFiatPriceHistory($symbol: String!, $timeframe: HistoryTimeframe!) {
    market {
      fiatPriceHistory(symbol: $symbol, timeframe: $timeframe) {
        date
        price
      }
    }
  }
`

type FiatRateResponse = {
  market: {
    fiatRate: {
      symbol: string
      price: string
      marketCap: string
      volume: string
      changePercent24Hr: number
    } | null
  }
}

type FiatPriceHistoryResponse = {
  market: {
    fiatPriceHistory: {
      date: number
      price: number
    }[]
  }
}

function timeframeToGraphQL(timeframe: HistoryTimeframe): string {
  const mapping: Record<HistoryTimeframe, string> = {
    '1H': 'HOUR',
    '24H': 'DAY',
    '1W': 'WEEK',
    '1M': 'MONTH',
    '1Y': 'YEAR',
    All: 'ALL',
  }
  return mapping[timeframe] || 'DAY'
}

export async function fetchFiatRateGraphQL(
  symbol: SupportedFiatCurrencies,
): Promise<MarketData | null> {
  if (symbol === 'USD') {
    return {
      price: '1',
      marketCap: '0',
      volume: '0',
      changePercent24Hr: 0,
    }
  }

  const client = getGraphQLClient()

  try {
    const response = await client.request<FiatRateResponse>(GET_FIAT_RATE, { symbol })

    if (!response.market.fiatRate) {
      return null
    }

    return {
      price: response.market.fiatRate.price,
      marketCap: response.market.fiatRate.marketCap,
      volume: response.market.fiatRate.volume,
      changePercent24Hr: response.market.fiatRate.changePercent24Hr,
    }
  } catch (error) {
    console.error(`[GraphQL] Failed to fetch fiat rate for ${symbol}:`, error)
    return null
  }
}

export async function fetchFiatPriceHistoryGraphQL(
  symbol: SupportedFiatCurrencies,
  timeframe: HistoryTimeframe,
): Promise<HistoryData[]> {
  if (symbol === 'USD') {
    return [{ date: 0, price: 1 }]
  }

  const client = getGraphQLClient()

  try {
    const response = await client.request<FiatPriceHistoryResponse>(GET_FIAT_PRICE_HISTORY, {
      symbol,
      timeframe: timeframeToGraphQL(timeframe),
    })

    return response.market.fiatPriceHistory.map(point => ({
      date: point.date,
      price: point.price,
    }))
  } catch (error) {
    console.error(`[GraphQL] Failed to fetch fiat price history for ${symbol}:`, error)
    return []
  }
}
