import type { AccountId } from '@shapeshiftoss/caip'
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

export type GraphQLEvmDetails = {
  __typename: 'EvmAccountDetails'
  nonce: number
  tokens: GraphQLTokenBalance[]
}

export type GraphQLUtxoDetails = {
  __typename: 'UtxoAccountDetails'
  addresses: GraphQLUtxoAddress[]
  nextChangeAddressIndex: number | null
  nextReceiveAddressIndex: number | null
}

export type GraphQLCosmosDetails = {
  __typename: 'CosmosAccountDetails'
  sequence: string | null
  accountNumber: string | null
  delegations: unknown | null
  redelegations: unknown | null
  undelegations: unknown | null
  rewards: unknown | null
}

export type GraphQLSolanaDetails = {
  __typename: 'SolanaAccountDetails'
  tokens: GraphQLTokenBalance[]
}

export type GraphQLAccountDetails =
  | GraphQLEvmDetails
  | GraphQLUtxoDetails
  | GraphQLCosmosDetails
  | GraphQLSolanaDetails

export type GraphQLAccount = {
  id: string
  balance: string
  pubkey: string
  chainId: string
  assetId: string
  tokens: GraphQLTokenBalance[]
  details: GraphQLAccountDetails | null
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
      details {
        __typename
        ... on EvmAccountDetails {
          nonce
          tokens {
            assetId
            balance
            name
            symbol
            precision
          }
        }
        ... on UtxoAccountDetails {
          addresses {
            pubkey
            balance
          }
          nextChangeAddressIndex
          nextReceiveAddressIndex
        }
        ... on CosmosAccountDetails {
          sequence
          accountNumber
          delegations
          redelegations
          undelegations
          rewards
        }
        ... on SolanaAccountDetails {
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
  }
`

type GetAccountsResponse = {
  accounts: (GraphQLAccount | null)[]
}

const DEBOUNCE_MS = 3000
const MAX_WAIT_MS = 10000

const accountResultCache = new Map<AccountId, GraphQLAccount | null>()

type PendingRequest = {
  resolve: (value: GraphQLAccount | null) => void
  reject: (error: Error) => void
}

const pendingRequests = new Map<AccountId, PendingRequest[]>()
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let maxWaitTimer: ReturnType<typeof setTimeout> | null = null
let flushInProgress = false

function scheduleFlush(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(flushPendingRequests, DEBOUNCE_MS)

  if (!maxWaitTimer) {
    maxWaitTimer = setTimeout(flushPendingRequests, MAX_WAIT_MS)
  }
}

async function flushPendingRequests(): Promise<void> {
  if (flushInProgress || pendingRequests.size === 0) return

  flushInProgress = true

  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (maxWaitTimer) {
    clearTimeout(maxWaitTimer)
    maxWaitTimer = null
  }

  const requestsToProcess = new Map(pendingRequests)
  pendingRequests.clear()

  const accountIds = Array.from(requestsToProcess.keys())
  console.log(`[GraphQL Accounts] Flushing ${accountIds.length} batched account requests into 1`)

  try {
    const client = getGraphQLClient()
    const response = await client.request<GetAccountsResponse>(GET_ACCOUNTS, {
      accountIds,
    })

    const resultMap = new Map<string, GraphQLAccount>()
    for (const item of response.accounts) {
      if (item) {
        resultMap.set(item.id, item)
      }
    }

    accountIds.forEach(accountId => {
      const result = resultMap.get(accountId) ?? null

      accountResultCache.set(accountId, result)

      const pendingForKey = requestsToProcess.get(accountId)
      pendingForKey?.forEach(({ resolve }) => resolve(result))
    })
  } catch (error) {
    console.error('[GraphQL Accounts] Failed to batch fetch:', error)
    requestsToProcess.forEach(pendingForKey => {
      pendingForKey.forEach(({ reject }) => reject(error as Error))
    })
  } finally {
    flushInProgress = false

    if (pendingRequests.size > 0) {
      scheduleFlush()
    }
  }
}

function queueRequest(accountId: AccountId): Promise<GraphQLAccount | null> {
  return new Promise((resolve, reject) => {
    const existing = pendingRequests.get(accountId)
    if (existing) {
      existing.push({ resolve, reject })
    } else {
      pendingRequests.set(accountId, [{ resolve, reject }])
    }
    scheduleFlush()
  })
}

export function clearAccountLoaderCache(): void {
  accountResultCache.clear()
  pendingRequests.clear()
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (maxWaitTimer) {
    clearTimeout(maxWaitTimer)
    maxWaitTimer = null
  }
}

export async function fetchAccountsGraphQL(
  accountIds: AccountId[],
): Promise<Record<AccountId, GraphQLAccount>> {
  if (accountIds.length === 0) {
    return {}
  }

  const result: Record<AccountId, GraphQLAccount> = {}
  const uncachedIds: AccountId[] = []

  for (const accountId of accountIds) {
    const cached = accountResultCache.get(accountId)
    if (cached !== undefined) {
      if (cached !== null) {
        result[accountId] = cached
      }
    } else {
      uncachedIds.push(accountId)
    }
  }

  if (uncachedIds.length === 0) {
    return result
  }

  const accounts = await Promise.all(uncachedIds.map(id => queueRequest(id)))

  for (let i = 0; i < uncachedIds.length; i++) {
    const account = accounts[i]
    if (account) {
      result[uncachedIds[i]] = account
    }
  }

  return result
}

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
