import DataLoader from 'dataloader'
import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'
import type { GraphQLRfoxUnstakingRequestsResult } from './rfoxData'

type SmartContractCheckKey = {
  address: string
  chainId: string
}

const BATCH_IS_SMART_CONTRACT_QUERY = gql`
  query BatchIsSmartContractAddress($requests: [SmartContractCheckRequest!]!) {
    evm {
      batchIsSmartContractAddress(requests: $requests)
    }
  }
`

type BatchIsSmartContractResponse = {
  evm: {
    batchIsSmartContractAddress: boolean[]
  }
}

const smartContractBatchFn = async (keys: readonly SmartContractCheckKey[]): Promise<boolean[]> => {
  const client = getGraphQLClient()

  console.log(`[DataLoader] Batching ${keys.length} smart contract checks into single request`)

  try {
    const response = await client.request<BatchIsSmartContractResponse>(
      BATCH_IS_SMART_CONTRACT_QUERY,
      { requests: keys },
    )
    return response.evm.batchIsSmartContractAddress
  } catch (error) {
    console.error('[DataLoader] Batch smart contract check failed:', error)
    return keys.map(() => false)
  }
}

let smartContractLoader: DataLoader<SmartContractCheckKey, boolean, string> | null = null

export const getSmartContractLoader = (): DataLoader<SmartContractCheckKey, boolean, string> => {
  if (!smartContractLoader) {
    smartContractLoader = new DataLoader<SmartContractCheckKey, boolean, string>(
      smartContractBatchFn,
      {
        cacheKeyFn: key => `${key.chainId}:${key.address.toLowerCase()}`,
        maxBatchSize: 100,
      },
    )
  }
  return smartContractLoader
}

export const loadIsSmartContractAddress = (address: string, chainId: string): Promise<boolean> => {
  return getSmartContractLoader().load({ address, chainId })
}

export const clearSmartContractCache = (): void => {
  smartContractLoader?.clearAll()
}

type RfoxUnstakingKey = {
  stakingAssetAccountAddress: string
  stakingAssetId: string
}

const BATCH_RFOX_UNSTAKING_QUERY = gql`
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

type BatchRfoxUnstakingResponse = {
  rfox: {
    batchUnstakingRequests: (GraphQLRfoxUnstakingRequestsResult | null)[]
  }
}

const rfoxUnstakingBatchFn = async (
  keys: readonly RfoxUnstakingKey[],
): Promise<(GraphQLRfoxUnstakingRequestsResult | null)[]> => {
  const client = getGraphQLClient()

  console.log(`[DataLoader] Batching ${keys.length} RFOX unstaking requests into single request`)

  try {
    const response = await client.request<BatchRfoxUnstakingResponse>(BATCH_RFOX_UNSTAKING_QUERY, {
      requests: keys,
    })
    return response.rfox.batchUnstakingRequests
  } catch (error) {
    console.error('[DataLoader] Batch RFOX unstaking request failed:', error)
    return keys.map(() => null)
  }
}

let rfoxUnstakingLoader: DataLoader<
  RfoxUnstakingKey,
  GraphQLRfoxUnstakingRequestsResult | null,
  string
> | null = null

export const getRfoxUnstakingLoader = (): DataLoader<
  RfoxUnstakingKey,
  GraphQLRfoxUnstakingRequestsResult | null,
  string
> => {
  if (!rfoxUnstakingLoader) {
    rfoxUnstakingLoader = new DataLoader<
      RfoxUnstakingKey,
      GraphQLRfoxUnstakingRequestsResult | null,
      string
    >(rfoxUnstakingBatchFn, {
      cacheKeyFn: key => `${key.stakingAssetAccountAddress.toLowerCase()}:${key.stakingAssetId}`,
      maxBatchSize: 50,
    })
  }
  return rfoxUnstakingLoader
}

export const loadRfoxUnstakingRequests = (
  stakingAssetAccountAddress: string,
  stakingAssetId: string,
): Promise<GraphQLRfoxUnstakingRequestsResult | null> => {
  return getRfoxUnstakingLoader().load({ stakingAssetAccountAddress, stakingAssetId })
}

export const clearRfoxUnstakingCache = (): void => {
  rfoxUnstakingLoader?.clearAll()
}

export const clearAllDataLoaderCaches = (): void => {
  clearSmartContractCache()
  clearRfoxUnstakingCache()
}
