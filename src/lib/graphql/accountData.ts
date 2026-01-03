import type { AccountId } from '@shapeshiftoss/caip'
import DataLoader from 'dataloader'
import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'

export type GraphQLTokenBalance = {
  assetId: string
  balance: string
  name: string | null
  symbol: string | null
  precision: number | null
}

export type GraphQLUtxoAddress = {
  pubkey: string
  balance: string
}

export type GraphQLEvmData = {
  nonce: number
  tokens: GraphQLTokenBalance[]
}

export type GraphQLUtxoData = {
  addresses: GraphQLUtxoAddress[]
  nextChangeAddressIndex: number | null
  nextReceiveAddressIndex: number | null
}

export type GraphQLCosmosData = {
  sequence: string | null
  accountNumber: string | null
  delegations: unknown | null
  redelegations: unknown | null
  undelegations: unknown | null
  rewards: unknown | null
}

export type GraphQLSolanaData = {
  tokens: GraphQLTokenBalance[]
}

export type GraphQLAccount = {
  id: string
  balance: string
  pubkey: string
  chainId: string
  assetId: string
  tokens: GraphQLTokenBalance[]
  evmData: GraphQLEvmData | null
  utxoData: GraphQLUtxoData | null
  cosmosData: GraphQLCosmosData | null
  solanaData: GraphQLSolanaData | null
}

const GET_ACCOUNTS = gql`
  query GetAccounts($accountIds: [String!]!) {
    accounts(accountIds: $accountIds) {
      id
      balance
      pubkey
      chainId
      assetId
      tokens {
        assetId
        balance
        name
        symbol
        precision
      }
      evmData {
        nonce
        tokens {
          assetId
          balance
          name
          symbol
          precision
        }
      }
      utxoData {
        addresses {
          pubkey
          balance
        }
        nextChangeAddressIndex
        nextReceiveAddressIndex
      }
      cosmosData {
        sequence
        accountNumber
        delegations
        redelegations
        undelegations
        rewards
      }
      solanaData {
        tokens {
          assetId
          balance
          name
          symbol
          precision
        }
      }
    }
  }
`

type GetAccountsResponse = {
  accounts: (GraphQLAccount | null)[]
}

/**
 * Batch function for DataLoader - fetches multiple accounts in a single GraphQL request
 */
async function batchGetAccounts(
  accountIds: readonly AccountId[],
): Promise<(GraphQLAccount | null)[]> {
  if (accountIds.length === 0) {
    return []
  }

  console.log(`[GraphQL DataLoader] Batching ${accountIds.length} account requests into 1`)

  const client = getGraphQLClient()
  const response = await client.request<GetAccountsResponse>(GET_ACCOUNTS, {
    accountIds: [...accountIds],
  })

  // Build result map for O(1) lookup
  const resultMap = new Map<string, GraphQLAccount>()
  for (const item of response.accounts) {
    if (item) {
      resultMap.set(item.id, item)
    }
  }

  // Return results in the same order as the input accountIds
  return accountIds.map(id => resultMap.get(id) ?? null)
}

// Batching window in milliseconds - allows requests from different async contexts to batch together
// Similar to Apollo Client's query batching which uses 10ms windows
const BATCH_WINDOW_MS = 16 // ~1 frame at 60fps

// Create a singleton DataLoader instance with custom batch scheduling
// Uses a batching window to collect requests across multiple event loop ticks
let accountLoader: DataLoader<AccountId, GraphQLAccount | null> | null = null

function getAccountLoader(): DataLoader<AccountId, GraphQLAccount | null> {
  if (!accountLoader) {
    accountLoader = new DataLoader<AccountId, GraphQLAccount | null>(batchGetAccounts, {
      cache: true, // Cache results for the lifetime of the loader
      maxBatchSize: 100, // Limit batch size to avoid overly large requests
      // Custom batch scheduler that waits for a short window to collect more requests
      // This allows requests from different chains/async contexts to batch together
      batchScheduleFn: callback => {
        setTimeout(callback, BATCH_WINDOW_MS)
      },
    })
  }
  return accountLoader
}

/**
 * Clear the DataLoader cache - useful when you need fresh data
 */
export function clearAccountLoaderCache(): void {
  if (accountLoader) {
    accountLoader.clearAll()
  }
}

/**
 * Fetch account data for multiple accounts via GraphQL with automatic batching.
 *
 * Uses DataLoader to automatically batch all requests that occur within the same
 * tick of the event loop. This dramatically reduces the number of HTTP requests
 * when fetching accounts for many chains in parallel.
 */
export async function fetchAccountsGraphQL(
  accountIds: AccountId[],
): Promise<Record<AccountId, GraphQLAccount>> {
  if (accountIds.length === 0) {
    return {}
  }

  const loader = getAccountLoader()

  // Load all accounts - DataLoader will batch these automatically
  const accounts = await loader.loadMany(accountIds)

  // Build the result record, filtering out errors and nulls
  const result: Record<AccountId, GraphQLAccount> = {}
  for (let i = 0; i < accountIds.length; i++) {
    const account = accounts[i]
    if (account && !(account instanceof Error)) {
      result[accountIds[i]] = account
    }
  }

  return result
}

/**
 * Fetch accounts immediately without batching (for cases where batching isn't needed)
 */
export async function fetchAccountsGraphQLDirect(
  accountIds: AccountId[],
): Promise<Record<AccountId, GraphQLAccount>> {
  if (accountIds.length === 0) {
    return {}
  }

  const client = getGraphQLClient()

  try {
    const response = await client.request<GetAccountsResponse>(GET_ACCOUNTS, {
      accountIds,
    })

    const result: Record<AccountId, GraphQLAccount> = {}

    for (const item of response.accounts) {
      if (item) {
        result[item.id as AccountId] = item
      }
    }

    return result
  } catch (error) {
    console.error('[GraphQL] Failed to fetch accounts:', error)
    throw error
  }
}

/**
 * Batch accounts into groups of maxBatchSize for efficient fetching
 */
export async function fetchAccountsBatched(
  accountIds: AccountId[],
  maxBatchSize = 50,
): Promise<Record<AccountId, GraphQLAccount>> {
  if (accountIds.length === 0) {
    return {}
  }

  const results: Record<AccountId, GraphQLAccount> = {}

  for (let i = 0; i < accountIds.length; i += maxBatchSize) {
    const batch = accountIds.slice(i, i + maxBatchSize)
    const batchResults = await fetchAccountsGraphQLDirect(batch)
    Object.assign(results, batchResults)
  }

  return results
}
