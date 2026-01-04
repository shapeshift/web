import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, toAssetId } from '@shapeshiftoss/caip'
import DataLoader from 'dataloader'
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
  return `${chainId}::${address}`
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

const BATCH_WINDOW_MS = 16

async function batchGetPortalsAccounts(
  keys: readonly PortalsAccountKey[],
): Promise<Record<AssetId, TokenInfo>[]> {
  if (keys.length === 0) return []

  console.log(`[GraphQL Portals DataLoader] Batching ${keys.length} account requests into 1`)

  const requests = keys.map(key => {
    const { chainId, address } = parsePortalsAccountKey(key)
    return { chainId, address }
  })

  try {
    const client = getGraphQLClient()
    const response = await client.request<GetPortalsAccountsResponse>(GET_PORTALS_ACCOUNTS, {
      requests,
    })

    return response.portals.accounts.map((tokens, index) => {
      const { chainId } = requests[index]
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
    })
  } catch (error) {
    console.error('[GraphQL Portals DataLoader] Failed to batch fetch:', error)
    return keys.map(() => ({}))
  }
}

let portalsAccountLoader: DataLoader<PortalsAccountKey, Record<AssetId, TokenInfo>> | null = null

function getPortalsAccountLoader(): DataLoader<PortalsAccountKey, Record<AssetId, TokenInfo>> {
  if (!portalsAccountLoader) {
    portalsAccountLoader = new DataLoader<PortalsAccountKey, Record<AssetId, TokenInfo>>(
      batchGetPortalsAccounts,
      {
        cache: true,
        maxBatchSize: 50,
        batchScheduleFn: callback => setTimeout(callback, BATCH_WINDOW_MS),
      },
    )
  }
  return portalsAccountLoader
}

export function clearPortalsAccountLoaderCache(): void {
  if (portalsAccountLoader) {
    portalsAccountLoader.clearAll()
  }
}

export async function fetchPortalsAccountGraphQL(
  chainId: ChainId,
  owner: string,
): Promise<Record<AssetId, TokenInfo>> {
  return getPortalsAccountLoader().load(createPortalsAccountKey(chainId, owner))
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
