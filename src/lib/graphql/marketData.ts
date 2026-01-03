import type { AssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'
import type { MarketData as GraphQLMarketData } from './generated/types'

// GraphQL query for fetching market data
const GET_MARKET_DATA = gql`
  query GetMarketData($assetIds: [String!]!) {
    marketData(assetIds: $assetIds) {
      assetId
      price
      marketCap
      volume
      changePercent24Hr
      supply
      maxSupply
    }
  }
`

type GetMarketDataResponse = {
  marketData: (GraphQLMarketData | null)[]
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
      if (item) {
        result[item.assetId as AssetId] = {
          price: item.price,
          marketCap: item.marketCap,
          volume: item.volume,
          changePercent24Hr: item.changePercent24Hr,
          supply: item.supply ?? undefined,
          maxSupply: item.maxSupply ?? undefined,
        }
      }
    }

    return result
  } catch (error) {
    console.error('[GraphQL] Failed to fetch market data:', error)
    throw error
  }
}
