import type { AssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'
import type { MarketData as GraphQLMarketData } from './generated/types'

// GraphQL query for fetching market data
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
