import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, toAssetId } from '@shapeshiftoss/caip'
import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'

const GET_PORTALS_ACCOUNT = gql`
  query GetPortalsAccount($chainId: ChainId!, $address: String!) {
    portalsAccount(chainId: $chainId, address: $address) {
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
  portalsAccount: PortalsTokenResponse[]
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

export async function fetchPortalsAccountGraphQL(
  chainId: ChainId,
  owner: string,
): Promise<Record<AssetId, TokenInfo>> {
  try {
    const client = getGraphQLClient()
    const response = await client.request<GetPortalsAccountResponse>(GET_PORTALS_ACCOUNT, {
      chainId,
      address: owner,
    })

    return response.portalsAccount.reduce<Record<AssetId, TokenInfo>>((acc, token) => {
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
