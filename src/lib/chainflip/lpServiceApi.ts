import axios from 'axios'

const LP_SERVICE_GRAPHQL_URL = 'https://lp-service.chainflip.io/graphql'
const LP_SERVICE_REQUEST_TIMEOUT_MS = 10_000

export type LendingPoolStatPoint = {
  timestamp: string
  avgInterestRateBps: number
  avgUtilisationRateBps: number
  projectedApy: string
}

type LendingPoolStatsResponse = {
  data: {
    allLendingPoolStats: {
      nodes: LendingPoolStatPoint[]
    }
  }
}

const LENDING_POOL_STATS_QUERY = `
  query GetLendingPoolStats($asset: ChainflipAsset!, $since: Datetime!) {
    allLendingPoolStats(
      filter: {
        asset: { equalTo: $asset }
        timestamp: { greaterThanOrEqualTo: $since }
      }
      orderBy: TIMESTAMP_ASC
    ) {
      nodes {
        timestamp
        avgInterestRateBps
        avgUtilisationRateBps
        projectedApy
      }
    }
  }
`

// Convert ChainflipAssetSymbol (e.g. "USDC") to lp-service GraphQL enum casing (e.g. "Usdc")
const toGraphqlAsset = (asset: string): string => asset.charAt(0) + asset.slice(1).toLowerCase()

export const queryLendingPoolStats = async (
  asset: string,
  since: Date,
): Promise<LendingPoolStatPoint[]> => {
  const { data } = await axios.post<LendingPoolStatsResponse>(
    LP_SERVICE_GRAPHQL_URL,
    {
      query: LENDING_POOL_STATS_QUERY,
      variables: {
        asset: toGraphqlAsset(asset),
        since: since.toISOString(),
      },
    },
    { timeout: LP_SERVICE_REQUEST_TIMEOUT_MS },
  )

  return data.data.allLendingPoolStats.nodes
}
