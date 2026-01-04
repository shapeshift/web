import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'

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

type MarketOrderField =
  | 'MARKET_CAP_DESC'
  | 'MARKET_CAP_ASC'
  | 'VOLUME_DESC'
  | 'VOLUME_ASC'
  | 'PRICE_CHANGE_24H_DESC'
  | 'PRICE_CHANGE_24H_ASC'

function toMarketOrderField(order: CoingeckoSortKey): MarketOrderField {
  const mapping: Record<CoingeckoSortKey, MarketOrderField> = {
    market_cap_asc: 'MARKET_CAP_ASC',
    market_cap_desc: 'MARKET_CAP_DESC',
    volume_asc: 'VOLUME_ASC',
    volume_desc: 'VOLUME_DESC',
    price_change_percentage_24h_desc: 'PRICE_CHANGE_24H_DESC',
    price_change_percentage_24h_asc: 'PRICE_CHANGE_24H_ASC',
    id_asc: 'MARKET_CAP_DESC',
    id_desc: 'MARKET_CAP_DESC',
  }
  return mapping[order] || 'MARKET_CAP_DESC'
}

const GET_TRENDING = gql`
  query GetMarketTrending($limit: Int) {
    market {
      trending(limit: $limit) {
        id
        name
        symbol
        marketCapRank
        images {
          thumb
          small
          large
        }
        score
      }
    }
  }
`

const GET_TOP_MOVERS = gql`
  query GetMarketMovers {
    market {
      movers {
        topGainers {
          id
          name
          symbol
          priceChangePercentage24h
          marketCap
          marketCapRank
          images {
            thumb
            small
            large
          }
        }
        topLosers {
          id
          name
          symbol
          priceChangePercentage24h
          marketCap
          marketCapRank
          images {
            thumb
            small
            large
          }
        }
      }
    }
  }
`

const GET_RECENTLY_ADDED = gql`
  query GetMarketRecentlyAdded($limit: Int) {
    market {
      recentlyAdded(limit: $limit) {
        id
        name
        symbol
        activatedAt
      }
    }
  }
`

const GET_TOP_ASSETS = gql`
  query GetMarketTopAssets($first: Int, $after: String, $orderBy: MarketOrderField) {
    market {
      topAssets(first: $first, after: $after, orderBy: $orderBy) {
        edges {
          node {
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
            circulatingSupply
            totalSupply
            maxSupply
            lastUpdated
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
        totalCount
      }
    }
  }
`

type TrendingAsset = {
  id: string
  name: string
  symbol: string
  marketCapRank: number | null
  images: {
    thumb: string | null
    small: string | null
    large: string | null
  }
  score: number | null
}

type MovingAsset = {
  id: string
  name: string
  symbol: string
  priceChangePercentage24h: number
  marketCap: number | null
  marketCapRank: number | null
  images: {
    thumb: string | null
    small: string | null
    large: string | null
  }
}

type MarketAsset = {
  id: string
  symbol: string
  name: string
  image: string | null
  currentPrice: number | null
  marketCap: number | null
  marketCapRank: number | null
  fullyDilutedValuation: number | null
  totalVolume: number | null
  high24h: number | null
  low24h: number | null
  priceChange24h: number | null
  priceChangePercentage24h: number | null
  circulatingSupply: number | null
  totalSupply: number | null
  maxSupply: number | null
  lastUpdated: string | null
}

type TrendingResponse = {
  market: {
    trending: TrendingAsset[]
  }
}

type TopMoversResponse = {
  market: {
    movers: {
      topGainers: MovingAsset[]
      topLosers: MovingAsset[]
    }
  }
}

type RecentlyAddedResponse = {
  market: {
    recentlyAdded: {
      id: string
      name: string
      symbol: string
      activatedAt: number | null
    }[]
  }
}

type TopAssetsResponse = {
  market: {
    topAssets: {
      edges: { node: MarketAsset }[]
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      totalCount: number | null
    }
  }
}

function trendingAssetToLegacy(asset: TrendingAsset): CoingeckoTrendingCoin {
  return {
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    marketCapRank: asset.marketCapRank,
    thumb: asset.images.thumb,
    small: asset.images.small,
    large: asset.images.large,
    score: asset.score,
  }
}

function movingAssetToLegacy(asset: MovingAsset): CoingeckoMover {
  return {
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    priceChangePercentage24h: asset.priceChangePercentage24h,
    marketCap: asset.marketCap,
    marketCapRank: asset.marketCapRank,
    thumb: asset.images.thumb,
    small: asset.images.small,
    large: asset.images.large,
  }
}

function marketAssetToLegacy(asset: MarketAsset): CoingeckoMarketCap {
  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    image: asset.image,
    currentPrice: asset.currentPrice ?? 0,
    marketCap: asset.marketCap ?? 0,
    marketCapRank: asset.marketCapRank,
    fullyDilutedValuation: asset.fullyDilutedValuation,
    totalVolume: asset.totalVolume ?? 0,
    high24h: asset.high24h,
    low24h: asset.low24h,
    priceChange24h: asset.priceChange24h,
    priceChangePercentage24h: asset.priceChangePercentage24h,
    marketCapChange24h: null,
    marketCapChangePercentage24h: null,
    circulatingSupply: asset.circulatingSupply,
    totalSupply: asset.totalSupply,
    maxSupply: asset.maxSupply,
    ath: null,
    athChangePercentage: null,
    athDate: null,
    atl: null,
    atlChangePercentage: null,
    atlDate: null,
    lastUpdated: asset.lastUpdated,
  }
}

export async function fetchTrendingGraphQL(): Promise<CoingeckoTrendingCoin[]> {
  const client = getGraphQLClient()
  const response = await client.request<TrendingResponse>(GET_TRENDING, { limit: 10 })
  return response.market.trending.map(trendingAssetToLegacy)
}

export async function fetchTopMoversGraphQL(): Promise<CoingeckoTopMovers> {
  const client = getGraphQLClient()
  const response = await client.request<TopMoversResponse>(GET_TOP_MOVERS)
  return {
    topGainers: response.market.movers.topGainers.map(movingAssetToLegacy),
    topLosers: response.market.movers.topLosers.map(movingAssetToLegacy),
  }
}

export async function fetchRecentlyAddedGraphQL(): Promise<CoingeckoRecentlyAddedCoin[]> {
  const client = getGraphQLClient()
  const response = await client.request<RecentlyAddedResponse>(GET_RECENTLY_ADDED, { limit: 20 })
  return response.market.recentlyAdded
}

export async function fetchMarketsGraphQL(
  order: CoingeckoSortKey,
  page: number = 1,
  perPage: number = 100,
): Promise<CoingeckoMarketCap[]> {
  const client = getGraphQLClient()
  const first = perPage
  const after =
    page > 1 ? Buffer.from(String((page - 1) * perPage - 1)).toString('base64') : undefined
  const orderBy = toMarketOrderField(order)

  const response = await client.request<TopAssetsResponse>(GET_TOP_ASSETS, {
    first,
    after,
    orderBy,
  })

  return response.market.topAssets.edges.map(edge => marketAssetToLegacy(edge.node))
}

export async function fetchTopMarketsGraphQL(
  count: number = 2500,
  order: CoingeckoSortKey = 'market_cap_desc',
): Promise<CoingeckoMarketCap[]> {
  const client = getGraphQLClient()
  const orderBy = toMarketOrderField(order)

  const response = await client.request<TopAssetsResponse>(GET_TOP_ASSETS, {
    first: count,
    orderBy,
  })

  return response.market.topAssets.edges.map(edge => marketAssetToLegacy(edge.node))
}
