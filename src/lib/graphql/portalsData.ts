import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, toAssetId } from '@shapeshiftoss/caip'
import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'

const GET_PORTALS_ACCOUNT = gql`
  query GetPortalsAccount($chainId: ChainId!, $address: String!) {
    portals {
      account(chainId: $chainId, address: $address) {
        key
        name
        decimals
        symbol
        address
        images
        image
        price
        pricePerShare
        platform
        network
        liquidity
        tokens
        apy
        volumeUsd1d
        volumeUsd7d
      }
    }
  }
`

const GET_PORTALS_ACCOUNTS = gql`
  query GetPortalsAccounts($requests: [PortalsAccountInput!]!) {
    portals {
      accounts(requests: $requests) {
        key
        name
        decimals
        symbol
        address
        images
        image
        price
        pricePerShare
        platform
        network
        liquidity
        tokens
        apy
        volumeUsd1d
        volumeUsd7d
      }
    }
  }
`

type PortalsTokenResponse = {
  key: string
  name: string
  decimals: number
  symbol: string
  address: string
  images: string[] | null
  image: string | null
  price: string | null
  pricePerShare: string | null
  platform: string
  network: string
  liquidity: number
  tokens: string[]
  apy: string | null
  volumeUsd1d: string | null
  volumeUsd7d: string | null
}

type GetPortalsAccountResponse = {
  portals: {
    account: PortalsTokenResponse[]
  }
}

export type TokenInfo = {
  key: string
  name: string
  decimals: number
  symbol: string
  address: string
  images?: string[]
  image?: string
  price?: string
  pricePerShare?: string
  platform: string
  network: string
  liquidity: number
  tokens: string[]
  metrics?: {
    apy?: string
    volumeUsd1d?: string
    volumeUsd7d?: string
  }
}

type PortalsAccountKey = `${ChainId}::${string}`

function createPortalsAccountKey(chainId: ChainId, address: string): PortalsAccountKey {
  return `${chainId}::${address.toLowerCase()}`
}

function parsePortalsAccountKey(key: PortalsAccountKey): { chainId: ChainId; address: string } {
  const [chainId, address] = key.split('::') as [ChainId, string]
  return { chainId, address }
}

type GetPortalsAccountsResponse = {
  portals: {
    accounts: PortalsTokenResponse[][]
  }
}

const DEBOUNCE_MS = 3000
const MAX_WAIT_MS = 10000

const portalsResultCache = new Map<string, Record<AssetId, TokenInfo>>()

type PendingRequest = {
  resolve: (value: Record<AssetId, TokenInfo>) => void
  reject: (error: Error) => void
}

const pendingRequests = new Map<PortalsAccountKey, PendingRequest[]>()
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let maxWaitTimer: ReturnType<typeof setTimeout> | null = null
let flushInProgress = false

function transformTokensToRecord(
  tokens: PortalsTokenResponse[],
  chainId: ChainId,
): Record<AssetId, TokenInfo> {
  return tokens.reduce<Record<AssetId, TokenInfo>>((acc, token) => {
    const assetId = toAssetId({
      chainId,
      assetNamespace: ASSET_NAMESPACE.erc20,
      assetReference: token.address,
    })
    acc[assetId] = {
      key: token.key,
      name: token.name,
      decimals: token.decimals,
      symbol: token.symbol,
      address: token.address,
      images: token.images ?? undefined,
      image: token.image ?? undefined,
      price: token.price ?? undefined,
      pricePerShare: token.pricePerShare ?? undefined,
      platform: token.platform,
      network: token.network,
      liquidity: token.liquidity,
      tokens: token.tokens,
      metrics: {
        apy: token.apy ?? undefined,
        volumeUsd1d: token.volumeUsd1d ?? undefined,
        volumeUsd7d: token.volumeUsd7d ?? undefined,
      },
    }
    return acc
  }, {})
}

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

  const keys = Array.from(requestsToProcess.keys())
  console.log(`[GraphQL Portals] Flushing ${keys.length} batched account requests into 1`)

  const requests = keys.map(key => {
    const { chainId, address } = parsePortalsAccountKey(key)
    return { chainId, address }
  })

  try {
    const client = getGraphQLClient()
    const response = await client.request<GetPortalsAccountsResponse>(GET_PORTALS_ACCOUNTS, {
      requests,
    })

    keys.forEach((key, index) => {
      const { chainId } = requests[index]
      const tokens = response.portals.accounts[index] ?? []
      const result = transformTokensToRecord(tokens, chainId)

      portalsResultCache.set(key, result)

      const pendingForKey = requestsToProcess.get(key)
      pendingForKey?.forEach(({ resolve }) => resolve(result))
    })
  } catch (error) {
    console.error('[GraphQL Portals] Failed to batch fetch:', error)
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

function queueRequest(cacheKey: PortalsAccountKey): Promise<Record<AssetId, TokenInfo>> {
  return new Promise((resolve, reject) => {
    const existing = pendingRequests.get(cacheKey)
    if (existing) {
      existing.push({ resolve, reject })
    } else {
      pendingRequests.set(cacheKey, [{ resolve, reject }])
    }
    scheduleFlush()
  })
}

export function clearPortalsAccountLoaderCache(): void {
  portalsResultCache.clear()
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

export function fetchPortalsAccountGraphQL(
  chainId: ChainId,
  owner: string,
): Promise<Record<AssetId, TokenInfo>> {
  const cacheKey = createPortalsAccountKey(chainId, owner)

  const cached = portalsResultCache.get(cacheKey)
  if (cached) return Promise.resolve(cached)

  return queueRequest(cacheKey).then(result => {
    portalsResultCache.set(cacheKey, result)
    return result
  })
}

export async function prefetchPortalsAccounts(
  accounts: { chainId: ChainId; owner: string }[],
): Promise<void> {
  if (accounts.length === 0) return

  await Promise.all(
    accounts.map(async ({ chainId, owner }) => {
      const cacheKey = createPortalsAccountKey(chainId, owner)
      const result = await queueRequest(cacheKey)
      portalsResultCache.set(cacheKey, result)
    }),
  )
}

export async function fetchPortalsAccountGraphQLDirect(
  chainId: ChainId,
  owner: string,
): Promise<Record<AssetId, TokenInfo>> {
  try {
    const client = getGraphQLClient()
    const response = await client.request<GetPortalsAccountResponse>(GET_PORTALS_ACCOUNT, {
      chainId,
      address: owner,
    })

    return response.portals.account.reduce<Record<AssetId, TokenInfo>>((acc, token) => {
      const assetId = toAssetId({
        chainId,
        assetNamespace: ASSET_NAMESPACE.erc20,
        assetReference: token.address,
      })
      acc[assetId] = {
        key: token.key,
        name: token.name,
        decimals: token.decimals,
        symbol: token.symbol,
        address: token.address,
        images: token.images ?? undefined,
        image: token.image ?? undefined,
        price: token.price ?? undefined,
        pricePerShare: token.pricePerShare ?? undefined,
        platform: token.platform,
        network: token.network,
        liquidity: token.liquidity,
        tokens: token.tokens,
        metrics: {
          apy: token.apy ?? undefined,
          volumeUsd1d: token.volumeUsd1d ?? undefined,
          volumeUsd7d: token.volumeUsd7d ?? undefined,
        },
      }
      return acc
    }, {})
  } catch (error) {
    console.error('[GraphQL] Failed to fetch portals account:', error)
    return {}
  }
}
