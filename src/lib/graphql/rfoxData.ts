import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'

export type GraphQLRfoxRewardDistribution = {
  amount: string
  rewardUnits: string
  totalRewardUnits: string
  txId: string
  rewardAddress: string
}

export type GraphQLRfoxEpochDetails = {
  totalRewardUnits: string
  distributionRate: number
  assetPriceUsd: string
  distributionsByStakingAddress: Record<string, GraphQLRfoxRewardDistribution>
}

export type GraphQLRfoxEpoch = {
  number: number
  ipfsHash: string
  startTimestamp: number
  endTimestamp: number
  distributionTimestamp: number
  startBlock: number
  endBlock: number
  treasuryAddress: string
  totalRevenue: string
  burnRate: number
  runePriceUsd: string
  distributionStatus: 'pending' | 'complete'
  detailsByStakingContract: Record<string, GraphQLRfoxEpochDetails>
}

export type GraphQLRfoxCurrentEpochMetadata = {
  epoch: number
  epochStartTimestamp: number
  epochEndTimestamp: number
  treasuryAddress: string
  burnRate: number
  distributionRateByStakingContract: Record<string, number>
  ipfsHashByEpoch: Record<string, string>
}

export type GraphQLRfoxUnstakingRequest = {
  unstakingBalance: string
  cooldownExpiry: string
  index: number
}

export type GraphQLRfoxUnstakingRequestsResult = {
  stakingAssetAccountAddress: string
  contractAddress: string
  unstakingRequests: GraphQLRfoxUnstakingRequest[]
}

const GET_RFOX_EPOCH_HISTORY = gql`
  query GetRfoxEpochHistory {
    rfox {
      epochHistory {
        number
        ipfsHash
        startTimestamp
        endTimestamp
        distributionTimestamp
        startBlock
        endBlock
        treasuryAddress
        totalRevenue
        burnRate
        runePriceUsd
        distributionStatus
        detailsByStakingContract
      }
    }
  }
`

const GET_RFOX_CURRENT_EPOCH_METADATA = gql`
  query GetRfoxCurrentEpochMetadata {
    rfox {
      currentEpochMetadata {
        epoch
        epochStartTimestamp
        epochEndTimestamp
        treasuryAddress
        burnRate
        distributionRateByStakingContract
        ipfsHashByEpoch
      }
    }
  }
`

type EpochHistoryResponse = {
  rfox: {
    epochHistory: GraphQLRfoxEpoch[]
  }
}

type CurrentEpochMetadataResponse = {
  rfox: {
    currentEpochMetadata: GraphQLRfoxCurrentEpochMetadata
  }
}

export const fetchRfoxEpochHistoryGraphQL = async (): Promise<GraphQLRfoxEpoch[]> => {
  const client = getGraphQLClient()

  console.log('[GraphQL RFOX] Fetching epoch history (batched)')

  try {
    const response = await client.request<EpochHistoryResponse>(GET_RFOX_EPOCH_HISTORY)
    console.log(`[GraphQL RFOX] Received ${response.rfox.epochHistory.length} epochs`)
    return response.rfox.epochHistory
  } catch (error) {
    console.error('[GraphQL RFOX] Failed to fetch epoch history:', error)
    return []
  }
}

export const fetchRfoxCurrentEpochMetadataGraphQL =
  async (): Promise<GraphQLRfoxCurrentEpochMetadata | null> => {
    const client = getGraphQLClient()

    console.log('[GraphQL RFOX] Fetching current epoch metadata')

    try {
      const response = await client.request<CurrentEpochMetadataResponse>(
        GET_RFOX_CURRENT_EPOCH_METADATA,
      )
      return response.rfox.currentEpochMetadata
    } catch (error) {
      console.error('[GraphQL RFOX] Failed to fetch current epoch metadata:', error)
      return null
    }
  }

const GET_RFOX_BATCH_UNSTAKING_REQUESTS = gql`
  query GetRfoxBatchUnstakingRequests($requests: [RfoxUnstakingRequestInput!]!) {
    rfox {
      batchUnstakingRequests(requests: $requests) {
        stakingAssetAccountAddress
        contractAddress
        unstakingRequests {
          unstakingBalance
          cooldownExpiry
          index
        }
      }
    }
  }
`

type BatchUnstakingRequestsResponse = {
  rfox: {
    batchUnstakingRequests: (GraphQLRfoxUnstakingRequestsResult | null)[]
  }
}

export const fetchRfoxUnstakingRequestsGraphQL = async (
  requests: { stakingAssetAccountAddress: string; stakingAssetId: string }[],
): Promise<(GraphQLRfoxUnstakingRequestsResult | null)[]> => {
  const client = getGraphQLClient()

  console.log(`[GraphQL RFOX] Fetching unstaking requests for ${requests.length} accounts`)

  try {
    const response = await client.request<BatchUnstakingRequestsResponse>(
      GET_RFOX_BATCH_UNSTAKING_REQUESTS,
      { requests },
    )
    return response.rfox.batchUnstakingRequests
  } catch (error) {
    console.error('[GraphQL RFOX] Failed to fetch unstaking requests:', error)
    throw error
  }
}
