import type { AccountId, AssetNamespace, ChainId } from '@shapeshiftoss/caip'
import {
  avalancheChainId,
  bscChainId,
  ethChainId,
  fromAccountId,
  optimismChainId,
  polygonChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { NftContract } from 'alchemy-sdk'
import { invert } from 'lodash'

import type { NftCollectionItem } from './types'

// addresses are repeated across EVM chains
export const accountIdsToEvmAddresses = (accountIds: AccountId[]): string[] =>
  Array.from(
    new Set(
      accountIds
        .map(fromAccountId)
        .filter(({ chainId }) => isEvmChainId(chainId))
        .map(({ account }) => account),
    ),
  )

export enum SupportedOpenseaNetwork {
  Polygon = 'matic',
  Optimism = 'optimism',
  Ethereum = 'ethereum',
  BinanceSmartChain = 'bsc',
  Avalanche = 'avalanche',
  // Klaytn = 'klaytn',
  // Arbitrum = 'arbitrum',
  // Solana = 'solana',
}

// Opensea network <-> ChainId, shared amongst NFT resolvers
// Move me to openseaApi/validators.ts if/when we implement Opensea API
export const OPENSEA_NETWORKS_TO_CHAIN_ID_MAP: Record<SupportedOpenseaNetwork, ChainId> = {
  [SupportedOpenseaNetwork.Avalanche]: avalancheChainId,
  [SupportedOpenseaNetwork.BinanceSmartChain]: bscChainId,
  [SupportedOpenseaNetwork.Ethereum]: ethChainId,
  [SupportedOpenseaNetwork.Optimism]: optimismChainId,
  [SupportedOpenseaNetwork.Polygon]: polygonChainId,
} as const

export const CHAIN_ID_TO_OPENSEA_NETWORK_MAP = invert(OPENSEA_NETWORKS_TO_CHAIN_ID_MAP) as Partial<
  Record<ChainId, SupportedOpenseaNetwork>
>

export const openseaNetworkToChainId = (network: SupportedOpenseaNetwork): ChainId | undefined =>
  OPENSEA_NETWORKS_TO_CHAIN_ID_MAP[network]

export const chainIdToOpenseaNetwork = (chainId: ChainId): SupportedOpenseaNetwork | undefined =>
  CHAIN_ID_TO_OPENSEA_NETWORK_MAP[chainId]

export const parseNftContract = (contract: NftContract, chainId: ChainId): NftCollectionItem => {
  const { name, openSea } = contract

  const socialLinks = [
    ...(openSea?.twitterUsername
      ? [
          {
            name: 'Twitter',
            label: 'twitter',
            url: `https://twitter.com/${openSea.twitterUsername}`,
            logoUrl: '',
          },
        ]
      : []),
    ...(openSea?.discordUrl
      ? [
          {
            name: 'Discord',
            label: 'discord',
            url: openSea.discordUrl,
            logoUrl: '',
          },
        ]
      : []),
    ...(openSea?.externalUrl
      ? [
          {
            name: 'Website',
            label: 'website',
            url: openSea.externalUrl,
            logoUrl: '',
          },
        ]
      : []),
  ]
  const id = toAssetId({
    assetReference: contract.address,
    assetNamespace: contract.tokenType.toLowerCase() as AssetNamespace,
    chainId,
  })

  return {
    id,
    chainId,
    name: name || '',
    floorPrice: openSea?.floorPrice?.toString() || null,
    openseaId: openSea && openSea.collectionName ? openSea.collectionName : null,
    description: openSea?.description || null,
    socialLinks,
  }
}
