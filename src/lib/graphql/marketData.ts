import type { AssetId } from '@shapeshiftoss/caip'
import type { MarketCapResult, MarketData } from '@shapeshiftoss/types'
import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'
import type { MarketData as GraphQLMarketData } from './generated/types'

const GET_MARKET_DATA = gql`
  query GetMarketData($assetIds: [String!]!) {
    marketData(assetIds: $assetIds) {
      data {
        assetId
        price
        marketCap
        volume
        changePercent24Hr
        supply
        maxSupply
      }
      error {
        code
        message
        assetId
      }
    }
  }
`

type MarketDataResultResponse = {
  data: GraphQLMarketData | null
  error: { code: string; message: string; assetId?: string } | null
}

type GetMarketDataResponse = {
  marketData: MarketDataResultResponse[]
}

/**
 * Fetch market data for multiple assets via GraphQL
 *
 * This batches all assetIds into a single GraphQL request,
 * which the server then batches via DataLoader to minimize
 * upstream API calls.
 */
export async function fetchMarketDataGraphQL(
  assetIds: AssetId[],
): Promise<Record<AssetId, MarketData>> {
  const client = getGraphQLClient()

  try {
    const response = await client.request<GetMarketDataResponse>(GET_MARKET_DATA, {
      assetIds,
    })

    // Transform response into the expected format
    const result: Record<AssetId, MarketData> = {}

    for (const item of response.marketData) {
      if (item.data) {
        const marketData = item.data
        result[marketData.assetId as AssetId] = {
          price: marketData.price,
          marketCap: marketData.marketCap,
          volume: marketData.volume,
          changePercent24Hr: marketData.changePercent24Hr,
          supply: marketData.supply ?? undefined,
          maxSupply: marketData.maxSupply ?? undefined,
        }
      } else if (item.error) {
        console.warn(`[GraphQL] Market data error for ${item.error.assetId}: ${item.error.message}`)
      }
    }

    return result
  } catch (error) {
    console.error('[GraphQL] Failed to fetch market data:', error)
    throw error
  }
}

const GET_TOP_MARKET_ASSETS = gql`
  query GetTopMarketAssets($first: Int!, $after: String) {
    market {
      topAssets(first: $first, after: $after, orderBy: MARKET_CAP_DESC) {
        edges {
          cursor
          node {
            assetId
            currentPrice
            marketCap
            totalVolume
            priceChangePercentage24h
            circulatingSupply
            maxSupply
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

type TopMarketAssetsNode = {
  assetId: string | null
  currentPrice: number | null
  marketCap: number | null
  totalVolume: number | null
  priceChangePercentage24h: number | null
  circulatingSupply: number | null
  maxSupply: number | null
}

type TopMarketAssetsResponse = {
  market: {
    topAssets: {
      edges: {
        cursor: string
        node: TopMarketAssetsNode
      }[]
      pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
      }
      totalCount: number | null
    }
  }
}

const BATCH_SIZE = 250
const TOP_ASSETS_COUNT = 2000

export async function fetchTopMarketDataGraphQL(): Promise<MarketCapResult> {
  const client = getGraphQLClient()
  const result: MarketCapResult = {}

  let cursor: string | undefined
  let fetched = 0

  while (fetched < TOP_ASSETS_COUNT) {
    const batchSize = Math.min(BATCH_SIZE, TOP_ASSETS_COUNT - fetched)

    try {
      const response = await client.request<TopMarketAssetsResponse>(GET_TOP_MARKET_ASSETS, {
        first: batchSize,
        after: cursor,
      })

      const { edges, pageInfo } = response.market.topAssets

      for (const edge of edges) {
        const { node } = edge
        if (!node.assetId) continue

        const assetId = node.assetId as AssetId
        result[assetId] = {
          price: node.currentPrice?.toString() ?? '0',
          marketCap: node.marketCap?.toString() ?? '0',
          volume: node.totalVolume?.toString() ?? '0',
          changePercent24Hr: node.priceChangePercentage24h ?? 0,
          supply: node.circulatingSupply?.toString(),
          maxSupply: node.maxSupply?.toString(),
        }
      }

      fetched += edges.length

      if (!pageInfo.hasNextPage || !pageInfo.endCursor) {
        break
      }

      cursor = pageInfo.endCursor
    } catch (error) {
      console.error(`[GraphQL] Failed to fetch top market data batch at cursor ${cursor}:`, error)
      throw error
    }
  }

  return result
}
