import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'

// Types matching the GraphQL schema
export type CoingeckoTrendingCoin = {
  id: string
  name: string
  symbol: string
  marketCapRank: number | null
  thumb: string | null
  small: string | null
  large: string | null
  score: number | null
}

export type CoingeckoMover = {
  id: string
  name: string
  symbol: string
  priceChangePercentage24h: number
  marketCap: number | null
  marketCapRank: number | null
  thumb: string | null
  small: string | null
  large: string | null
}

export type CoingeckoTopMovers = {
  topGainers: CoingeckoMover[]
  topLosers: CoingeckoMover[]
}

export type CoingeckoRecentlyAddedCoin = {
  id: string
  name: string
  symbol: string
  activatedAt: number | null
}

export type CoingeckoMarketCap = {
  id: string
  symbol: string
  name: string
  image: string | null
  currentPrice: number
  marketCap: number
  marketCapRank: number | null
  fullyDilutedValuation: number | null
  totalVolume: number
  high24h: number | null
  low24h: number | null
  priceChange24h: number | null
  priceChangePercentage24h: number | null
  marketCapChange24h: number | null
  marketCapChangePercentage24h: number | null
  circulatingSupply: number | null
  totalSupply: number | null
  maxSupply: number | null
  ath: number | null
  athChangePercentage: number | null
  athDate: string | null
  atl: number | null
  atlChangePercentage: number | null
  atlDate: string | null
  lastUpdated: string | null
}

export type CoingeckoSortKey =
  | 'market_cap_asc'
  | 'market_cap_desc'
  | 'volume_asc'
  | 'volume_desc'
  | 'id_asc'
  | 'id_desc'
  | 'price_change_percentage_24h_desc'
  | 'price_change_percentage_24h_asc'

// GraphQL queries
const GET_TRENDING = gql`
  query GetCoingeckoTrending {
    coingeckoTrending {
      id
      name
      symbol
      marketCapRank
      thumb
      small
      large
      score
    }
  }
`

const GET_TOP_MOVERS = gql`
  query GetCoingeckoTopMovers {
    coingeckoTopMovers {
      topGainers {
        id
        name
        symbol
        priceChangePercentage24h
        marketCap
        marketCapRank
        thumb
        small
        large
      }
      topLosers {
        id
        name
        symbol
        priceChangePercentage24h
        marketCap
        marketCapRank
        thumb
        small
        large
      }
    }
  }
`

const GET_RECENTLY_ADDED = gql`
  query GetCoingeckoRecentlyAdded {
    coingeckoRecentlyAdded {
      id
      name
      symbol
      activatedAt
    }
  }
`

const GET_MARKETS = gql`
  query GetCoingeckoMarkets($order: CoingeckoSortKey!, $page: Int, $perPage: Int) {
    coingeckoMarkets(order: $order, page: $page, perPage: $perPage) {
      id
      symbol
      name
      image
      currentPrice
      marketCap
      marketCapRank
      fullyDilutedValuation
      totalVolume
      high24h
      low24h
      priceChange24h
      priceChangePercentage24h
      marketCapChange24h
      marketCapChangePercentage24h
      circulatingSupply
      totalSupply
      maxSupply
      ath
      athChangePercentage
      athDate
      atl
      atlChangePercentage
      atlDate
      lastUpdated
    }
  }
`

const GET_TOP_MARKETS = gql`
  query GetCoingeckoTopMarkets($count: Int, $order: CoingeckoSortKey) {
    coingeckoTopMarkets(count: $count, order: $order) {
      id
      symbol
      name
      image
      currentPrice
      marketCap
      marketCapRank
      fullyDilutedValuation
      totalVolume
      high24h
      low24h
      priceChange24h
      priceChangePercentage24h
      marketCapChange24h
      marketCapChangePercentage24h
      circulatingSupply
      totalSupply
      maxSupply
      ath
      athChangePercentage
      athDate
      atl
      atlChangePercentage
      atlDate
      lastUpdated
    }
  }
`

type TrendingResponse = {
  coingeckoTrending: CoingeckoTrendingCoin[]
}

type TopMoversResponse = {
  coingeckoTopMovers: CoingeckoTopMovers
}

type RecentlyAddedResponse = {
  coingeckoRecentlyAdded: CoingeckoRecentlyAddedCoin[]
}

type MarketsResponse = {
  coingeckoMarkets: CoingeckoMarketCap[]
}

type TopMarketsResponse = {
  coingeckoTopMarkets: CoingeckoMarketCap[]
}

/**
 * Fetch trending coins via GraphQL
 */
export async function fetchTrendingGraphQL(): Promise<CoingeckoTrendingCoin[]> {
  const client = getGraphQLClient()
  const response = await client.request<TrendingResponse>(GET_TRENDING)
  return response.coingeckoTrending
}

/**
 * Fetch top movers (gainers/losers) via GraphQL
 */
export async function fetchTopMoversGraphQL(): Promise<CoingeckoTopMovers> {
  const client = getGraphQLClient()
  const response = await client.request<TopMoversResponse>(GET_TOP_MOVERS)
  return response.coingeckoTopMovers
}

/**
 * Fetch recently added coins via GraphQL
 */
export async function fetchRecentlyAddedGraphQL(): Promise<CoingeckoRecentlyAddedCoin[]> {
  const client = getGraphQLClient()
  const response = await client.request<RecentlyAddedResponse>(GET_RECENTLY_ADDED)
  return response.coingeckoRecentlyAdded
}

/**
 * Fetch market data for a single page via GraphQL
 */
export async function fetchMarketsGraphQL(
  order: CoingeckoSortKey,
  page: number = 1,
  perPage: number = 100,
): Promise<CoingeckoMarketCap[]> {
  const client = getGraphQLClient()
  const response = await client.request<MarketsResponse>(GET_MARKETS, {
    order,
    page,
    perPage,
  })
  return response.coingeckoMarkets
}

/**
 * Fetch all top markets in a single request via GraphQL
 * This replaces the multi-page fetch in findAll, batching all pages server-side
 */
export async function fetchTopMarketsGraphQL(
  count: number = 2500,
  order: CoingeckoSortKey = 'market_cap_desc',
): Promise<CoingeckoMarketCap[]> {
  const client = getGraphQLClient()
  const response = await client.request<TopMarketsResponse>(GET_TOP_MARKETS, {
    count,
    order,
  })
  return response.coingeckoTopMarkets
}
