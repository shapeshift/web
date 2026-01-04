import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'

export type GraphQLTcyClaim = {
  asset: string
  amount: string
  l1Address: string
}

const GET_TCY_CLAIMS = gql`
  query GetTcyClaims($addresses: [String!]!) {
    thornode {
      tcyClaims(addresses: $addresses) {
        asset
        amount
        l1Address
      }
    }
  }
`

type TcyClaimsResponse = {
  thornode: {
    tcyClaims: GraphQLTcyClaim[]
  }
}

const DEBOUNCE_MS = 3000
const MAX_WAIT_MS = 10000

type TcyClaimsCacheKey = string

function createCacheKey(addresses: string[]): TcyClaimsCacheKey {
  return addresses
    .map(a => a.toLowerCase())
    .sort()
    .join(',')
}

const tcyClaimsResultCache = new Map<TcyClaimsCacheKey, GraphQLTcyClaim[]>()

type PendingRequest = {
  addresses: string[]
  resolve: (value: GraphQLTcyClaim[]) => void
  reject: (error: Error) => void
}

const pendingRequests = new Map<TcyClaimsCacheKey, PendingRequest[]>()
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

  const allAddresses = new Set<string>()
  requestsToProcess.forEach(requests => {
    requests.forEach(({ addresses }) => {
      addresses.forEach(addr => allAddresses.add(addr.toLowerCase()))
    })
  })

  const uniqueAddresses = Array.from(allAddresses)
  console.log(
    `[GraphQL TcyClaims] Flushing ${requestsToProcess.size} requests (${uniqueAddresses.length} unique addresses) into 1`,
  )

  try {
    const client = getGraphQLClient()
    const response = await client.request<TcyClaimsResponse>(GET_TCY_CLAIMS, {
      addresses: uniqueAddresses,
    })

    const allClaims = response.thornode.tcyClaims
    const claimsByAddress = new Map<string, GraphQLTcyClaim[]>()

    for (const claim of allClaims) {
      const addr = claim.l1Address.toLowerCase()
      const existing = claimsByAddress.get(addr) ?? []
      existing.push(claim)
      claimsByAddress.set(addr, existing)
    }

    requestsToProcess.forEach((requests, cacheKey) => {
      const firstRequest = requests[0]
      const claims: GraphQLTcyClaim[] = []

      for (const addr of firstRequest.addresses) {
        const addrClaims = claimsByAddress.get(addr.toLowerCase()) ?? []
        claims.push(...addrClaims)
      }

      tcyClaimsResultCache.set(cacheKey, claims)
      requests.forEach(({ resolve }) => resolve(claims))
    })
  } catch (error) {
    console.error('[GraphQL TcyClaims] Batch fetch failed:', error)
    requestsToProcess.forEach(requests => {
      requests.forEach(({ reject }) => reject(error as Error))
    })
  } finally {
    flushInProgress = false

    if (pendingRequests.size > 0) {
      scheduleFlush()
    }
  }
}

function queueRequest(addresses: string[]): Promise<GraphQLTcyClaim[]> {
  const cacheKey = createCacheKey(addresses)

  return new Promise((resolve, reject) => {
    const existing = pendingRequests.get(cacheKey)
    if (existing) {
      existing.push({ addresses, resolve, reject })
    } else {
      pendingRequests.set(cacheKey, [{ addresses, resolve, reject }])
    }
    scheduleFlush()
  })
}

export function clearTcyClaimsCache(): void {
  tcyClaimsResultCache.clear()
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

export function fetchTcyClaimsGraphQL(addresses: string[]): Promise<GraphQLTcyClaim[]> {
  if (addresses.length === 0) return Promise.resolve([])

  const cacheKey = createCacheKey(addresses)
  const cached = tcyClaimsResultCache.get(cacheKey)
  if (cached) return Promise.resolve(cached)

  return queueRequest(addresses)
}

export type AddressToAccountIdMap = Map<string, string>

export async function fetchTcyClaimsWithAccountMapping(
  addressToAccountId: AddressToAccountIdMap,
): Promise<{ claims: GraphQLTcyClaim[]; addressToAccountId: AddressToAccountIdMap }> {
  const addresses = Array.from(addressToAccountId.keys())
  const claims = await fetchTcyClaimsGraphQL(addresses)
  return { claims, addressToAccountId }
}
