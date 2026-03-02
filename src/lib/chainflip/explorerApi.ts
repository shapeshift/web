import axios from 'axios'

const CHAINFLIP_EXPLORER_GRAPHQL_URL = 'https://explorer-service-processor.chainflip.io/graphql'

export type LiquidityWithdrawalStatus = {
  broadcastComplete: boolean
  transactionRef: string | null
}

type LiquidityWithdrawalNode = {
  broadcastByBroadcastId: {
    broadcastSuccessEventId: string | null
    transactionRefsByBroadcastId: {
      nodes: { ref: string }[]
    }
  } | null
}

type LiquidityWithdrawalResponse = {
  data: {
    allLiquidityWithdrawals: {
      nodes: LiquidityWithdrawalNode[]
    }
  }
}

type LatestWithdrawalIdNode = {
  id: number
}

type LatestWithdrawalIdResponse = {
  data: {
    allLiquidityWithdrawals: {
      nodes: LatestWithdrawalIdNode[]
    }
  }
}

const toGraphqlAsset = (asset: string): string => asset.charAt(0) + asset.slice(1).toLowerCase()

const LATEST_WITHDRAWAL_ID_QUERY = `
  query GetLatestWithdrawalId($address: String!, $asset: ChainflipAsset!, $chain: ChainflipChain!) {
    allLiquidityWithdrawals(
      filter: {
        withdrawalAddress: { equalTo: $address }
        asset: { equalTo: $asset }
        chain: { equalTo: $chain }
      }
      orderBy: ID_DESC
      first: 1
    ) {
      nodes {
        id
      }
    }
  }
`

const LP_WITHDRAWAL_STATUS_QUERY = `
  query GetLpWithdrawalStatus($address: String!, $asset: ChainflipAsset!, $chain: ChainflipChain!, $afterId: Int!) {
    allLiquidityWithdrawals(
      filter: {
        withdrawalAddress: { equalTo: $address }
        asset: { equalTo: $asset }
        chain: { equalTo: $chain }
        id: { greaterThan: $afterId }
      }
      orderBy: ID_ASC
      first: 1
    ) {
      nodes {
        broadcastByBroadcastId {
          broadcastSuccessEventId
          transactionRefsByBroadcastId(first: 1) {
            nodes {
              ref
            }
          }
        }
      }
    }
  }
`

export const queryLatestWithdrawalId = async (
  withdrawalAddress: string,
  asset: string,
  chain: string,
): Promise<number> => {
  const graphqlAsset = toGraphqlAsset(asset)
  const normalizedAddress = withdrawalAddress.toLowerCase()

  try {
    const { data } = await axios.post<LatestWithdrawalIdResponse>(CHAINFLIP_EXPLORER_GRAPHQL_URL, {
      query: LATEST_WITHDRAWAL_ID_QUERY,
      variables: {
        address: normalizedAddress,
        asset: graphqlAsset,
        chain,
      },
    })

    return data.data.allLiquidityWithdrawals.nodes[0]?.id ?? 0
  } catch (e) {
    console.error('queryLatestWithdrawalId failed:', e)
    return 0
  }
}

export const queryLiquidityWithdrawalStatus = async (
  withdrawalAddress: string,
  asset: string,
  chain: string,
  afterId: number,
): Promise<LiquidityWithdrawalStatus | null> => {
  const graphqlAsset = toGraphqlAsset(asset)
  const normalizedAddress = withdrawalAddress.toLowerCase()

  try {
    const { data } = await axios.post<LiquidityWithdrawalResponse>(CHAINFLIP_EXPLORER_GRAPHQL_URL, {
      query: LP_WITHDRAWAL_STATUS_QUERY,
      variables: {
        address: normalizedAddress,
        asset: graphqlAsset,
        chain,
        afterId,
      },
    })

    const node = data.data.allLiquidityWithdrawals.nodes[0]
    if (!node?.broadcastByBroadcastId) {
      return { broadcastComplete: false, transactionRef: null }
    }

    const broadcast = node.broadcastByBroadcastId
    const txRef = broadcast.transactionRefsByBroadcastId.nodes[0]?.ref ?? null
    const broadcastComplete = broadcast.broadcastSuccessEventId !== null && txRef !== null

    return { broadcastComplete, transactionRef: txRef }
  } catch (e) {
    console.error('queryLiquidityWithdrawalStatus failed:', e)
    return null
  }
}
