import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'

export type GraphQLBorrower = {
  owner: string
  asset: string
  debtIssued: string
  debtRepaid: string
  debtCurrent: string
  collateralDeposited: string
  collateralWithdrawn: string
  collateralCurrent: string
  lastOpenHeight: number
  lastRepayHeight: number
}

export type GraphQLSaver = {
  asset: string
  assetAddress: string
  lastAddHeight: number
  units: string
  assetDepositValue: string
  assetRedeemValue: string
  growthPct: string
}

export type GraphQLRuneProvider = {
  runeAddress: string
  units: string
  value: string
  pnl: string
  depositAmount: string
  withdrawAmount: string
  lastDepositHeight: number
  lastWithdrawHeight: number
}

export type GraphQLRunepoolInformation = {
  pol: {
    runeDeposited: string
    runeWithdrawn: string
    value: string
    pnl: string
    currentDeposit: string
  }
  providers: {
    units: string
    pendingUnits: string
    pendingRune: string
    value: string
    pnl: string
    currentDeposit: string
  }
  reserve: {
    units: string
    value: string
    pnl: string
    currentDeposit: string
  }
}

const GET_ALL_POOL_BORROWERS = gql`
  query GetAllPoolBorrowers($assets: [String!]!) {
    thornode {
      allBorrowers(assets: $assets) {
        owner
        asset
        debtIssued
        debtRepaid
        debtCurrent
        collateralDeposited
        collateralWithdrawn
        collateralCurrent
        lastOpenHeight
        lastRepayHeight
      }
    }
  }
`

const GET_ALL_POOL_SAVERS = gql`
  query GetAllPoolSavers($assets: [String!]!) {
    thornode {
      allSavers(assets: $assets) {
        asset
        assetAddress
        lastAddHeight
        units
        assetDepositValue
        assetRedeemValue
        growthPct
      }
    }
  }
`

const GET_RUNE_PROVIDER = gql`
  query GetRuneProvider($address: String!) {
    thornode {
      runeProvider(address: $address) {
        runeAddress
        units
        value
        pnl
        depositAmount
        withdrawAmount
        lastDepositHeight
        lastWithdrawHeight
      }
    }
  }
`

const GET_RUNEPOOL_INFORMATION = gql`
  query GetRunepoolInformation {
    thornode {
      runepoolInformation {
        pol {
          runeDeposited
          runeWithdrawn
          value
          pnl
          currentDeposit
        }
        providers {
          units
          pendingUnits
          pendingRune
          value
          pnl
          currentDeposit
        }
        reserve {
          units
          value
          pnl
          currentDeposit
        }
      }
    }
  }
`

type AllPoolBorrowersResponse = {
  thornode: {
    allBorrowers: GraphQLBorrower[][]
  }
}

type AllPoolSaversResponse = {
  thornode: {
    allSavers: GraphQLSaver[][]
  }
}

type RuneProviderResponse = {
  thornode: {
    runeProvider: GraphQLRuneProvider | null
  }
}

type RunepoolInformationResponse = {
  thornode: {
    runepoolInformation: GraphQLRunepoolInformation | null
  }
}

const DEBOUNCE_MS = 3000
const MAX_WAIT_MS = 10000

type PendingRequest<T> = {
  resolve: (value: T) => void
  reject: (error: Error) => void
}

const saversResultCache = new Map<string, GraphQLSaver[]>()
const saversPendingRequests = new Map<string, PendingRequest<GraphQLSaver[]>[]>()
let saversDebounceTimer: ReturnType<typeof setTimeout> | null = null
let saversMaxWaitTimer: ReturnType<typeof setTimeout> | null = null
let saversFlushInProgress = false

const borrowersResultCache = new Map<string, GraphQLBorrower[]>()
const borrowersPendingRequests = new Map<string, PendingRequest<GraphQLBorrower[]>[]>()
let borrowersDebounceTimer: ReturnType<typeof setTimeout> | null = null
let borrowersMaxWaitTimer: ReturnType<typeof setTimeout> | null = null
let borrowersFlushInProgress = false

function scheduleSaversFlush(): void {
  if (saversDebounceTimer) {
    clearTimeout(saversDebounceTimer)
  }
  saversDebounceTimer = setTimeout(flushSaversPendingRequests, DEBOUNCE_MS)

  if (!saversMaxWaitTimer) {
    saversMaxWaitTimer = setTimeout(flushSaversPendingRequests, MAX_WAIT_MS)
  }
}

async function flushSaversPendingRequests(): Promise<void> {
  if (saversFlushInProgress || saversPendingRequests.size === 0) return

  saversFlushInProgress = true

  if (saversDebounceTimer) {
    clearTimeout(saversDebounceTimer)
    saversDebounceTimer = null
  }
  if (saversMaxWaitTimer) {
    clearTimeout(saversMaxWaitTimer)
    saversMaxWaitTimer = null
  }

  const requestsToProcess = new Map(saversPendingRequests)
  saversPendingRequests.clear()

  const poolAssetIds = Array.from(requestsToProcess.keys())
  console.log(`[GraphQL Savers] Flushing ${poolAssetIds.length} pools into single request`)

  try {
    const client = getGraphQLClient()
    const response = await client.request<AllPoolSaversResponse>(GET_ALL_POOL_SAVERS, {
      assets: poolAssetIds,
    })

    const totalSavers = response.thornode.allSavers.reduce((sum, arr) => sum + arr.length, 0)
    console.log(
      `[GraphQL Savers] Received ${totalSavers} savers across ${poolAssetIds.length} pools`,
    )

    poolAssetIds.forEach((poolAssetId, index) => {
      const result = response.thornode.allSavers[index] ?? []

      saversResultCache.set(poolAssetId, result)

      const pendingForKey = requestsToProcess.get(poolAssetId)
      pendingForKey?.forEach(({ resolve }) => resolve(result))
    })
  } catch (error) {
    console.error('[GraphQL Savers] Batch fetch failed:', error)
    requestsToProcess.forEach(pendingForKey => {
      pendingForKey.forEach(({ reject }) => reject(error as Error))
    })
  } finally {
    saversFlushInProgress = false

    if (saversPendingRequests.size > 0) {
      scheduleSaversFlush()
    }
  }
}

function queueSaversRequest(poolAssetId: string): Promise<GraphQLSaver[]> {
  return new Promise((resolve, reject) => {
    const existing = saversPendingRequests.get(poolAssetId)
    if (existing) {
      existing.push({ resolve, reject })
    } else {
      saversPendingRequests.set(poolAssetId, [{ resolve, reject }])
    }
    scheduleSaversFlush()
  })
}

function scheduleBorrowersFlush(): void {
  if (borrowersDebounceTimer) {
    clearTimeout(borrowersDebounceTimer)
  }
  borrowersDebounceTimer = setTimeout(flushBorrowersPendingRequests, DEBOUNCE_MS)

  if (!borrowersMaxWaitTimer) {
    borrowersMaxWaitTimer = setTimeout(flushBorrowersPendingRequests, MAX_WAIT_MS)
  }
}

async function flushBorrowersPendingRequests(): Promise<void> {
  if (borrowersFlushInProgress || borrowersPendingRequests.size === 0) return

  borrowersFlushInProgress = true

  if (borrowersDebounceTimer) {
    clearTimeout(borrowersDebounceTimer)
    borrowersDebounceTimer = null
  }
  if (borrowersMaxWaitTimer) {
    clearTimeout(borrowersMaxWaitTimer)
    borrowersMaxWaitTimer = null
  }

  const requestsToProcess = new Map(borrowersPendingRequests)
  borrowersPendingRequests.clear()

  const poolAssetIds = Array.from(requestsToProcess.keys())
  console.log(`[GraphQL Borrowers] Flushing ${poolAssetIds.length} pools into single request`)

  try {
    const client = getGraphQLClient()
    const response = await client.request<AllPoolBorrowersResponse>(GET_ALL_POOL_BORROWERS, {
      assets: poolAssetIds,
    })

    const totalBorrowers = response.thornode.allBorrowers.reduce((sum, arr) => sum + arr.length, 0)
    console.log(
      `[GraphQL Borrowers] Received ${totalBorrowers} borrowers across ${poolAssetIds.length} pools`,
    )

    poolAssetIds.forEach((poolAssetId, index) => {
      const result = response.thornode.allBorrowers[index] ?? []

      borrowersResultCache.set(poolAssetId, result)

      const pendingForKey = requestsToProcess.get(poolAssetId)
      pendingForKey?.forEach(({ resolve }) => resolve(result))
    })
  } catch (error) {
    console.error('[GraphQL Borrowers] Batch fetch failed:', error)
    requestsToProcess.forEach(pendingForKey => {
      pendingForKey.forEach(({ reject }) => reject(error as Error))
    })
  } finally {
    borrowersFlushInProgress = false

    if (borrowersPendingRequests.size > 0) {
      scheduleBorrowersFlush()
    }
  }
}

function queueBorrowersRequest(poolAssetId: string): Promise<GraphQLBorrower[]> {
  return new Promise((resolve, reject) => {
    const existing = borrowersPendingRequests.get(poolAssetId)
    if (existing) {
      existing.push({ resolve, reject })
    } else {
      borrowersPendingRequests.set(poolAssetId, [{ resolve, reject }])
    }
    scheduleBorrowersFlush()
  })
}

export const thornodeService = {
  loadSavers(poolAssetId: string): Promise<GraphQLSaver[]> {
    const cached = saversResultCache.get(poolAssetId)
    if (cached) return Promise.resolve(cached)

    return queueSaversRequest(poolAssetId)
  },

  loadBorrowers(poolAssetId: string): Promise<GraphQLBorrower[]> {
    const cached = borrowersResultCache.get(poolAssetId)
    if (cached) return Promise.resolve(cached)

    return queueBorrowersRequest(poolAssetId)
  },

  clearCache(): void {
    saversResultCache.clear()
    saversPendingRequests.clear()
    if (saversDebounceTimer) {
      clearTimeout(saversDebounceTimer)
      saversDebounceTimer = null
    }
    if (saversMaxWaitTimer) {
      clearTimeout(saversMaxWaitTimer)
      saversMaxWaitTimer = null
    }

    borrowersResultCache.clear()
    borrowersPendingRequests.clear()
    if (borrowersDebounceTimer) {
      clearTimeout(borrowersDebounceTimer)
      borrowersDebounceTimer = null
    }
    if (borrowersMaxWaitTimer) {
      clearTimeout(borrowersMaxWaitTimer)
      borrowersMaxWaitTimer = null
    }
  },

  clearSaversCache(poolAssetId?: string): void {
    if (poolAssetId) {
      saversResultCache.delete(poolAssetId)
    } else {
      saversResultCache.clear()
    }
  },

  clearBorrowersCache(poolAssetId?: string): void {
    if (poolAssetId) {
      borrowersResultCache.delete(poolAssetId)
    } else {
      borrowersResultCache.clear()
    }
  },
}

export function fetchPoolSaversGraphQL(poolAssetId: string): Promise<GraphQLSaver[]> {
  return thornodeService.loadSavers(poolAssetId)
}

export function fetchPoolBorrowersGraphQL(poolAssetId: string): Promise<GraphQLBorrower[]> {
  return thornodeService.loadBorrowers(poolAssetId)
}

export async function fetchRuneProviderGraphQL(
  address: string,
): Promise<GraphQLRuneProvider | null> {
  try {
    const client = getGraphQLClient()
    const response = await client.request<RuneProviderResponse>(GET_RUNE_PROVIDER, { address })
    return response.thornode.runeProvider
  } catch (error) {
    console.error('[GraphQL RuneProvider] Fetch failed:', error)
    return null
  }
}

export async function fetchRunepoolInformationGraphQL(): Promise<GraphQLRunepoolInformation | null> {
  try {
    const client = getGraphQLClient()
    const response = await client.request<RunepoolInformationResponse>(GET_RUNEPOOL_INFORMATION)
    return response.thornode.runepoolInformation
  } catch (error) {
    console.error('[GraphQL RunepoolInformation] Fetch failed:', error)
    return null
  }
}
