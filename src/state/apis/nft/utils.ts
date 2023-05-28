import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import {
  avalancheChainId,
  bscChainId,
  ethChainId,
  fromAccountId,
  optimismChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { invert } from 'lodash'

import type { NftItem } from './types'

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

export const updateNftItem = (originalItem: NftItem, currentItem: NftItem) => {
  if (!originalItem.medias.length && currentItem.medias.length) {
    originalItem.medias = currentItem.medias
  }
  if (originalItem.rarityRank === null && typeof currentItem.rarityRank === 'number') {
    originalItem.rarityRank = currentItem.rarityRank
  }
  if (!originalItem.collection.floorPrice && currentItem.collection.floorPrice) {
    originalItem.collection.floorPrice = currentItem.collection.floorPrice
  }

  if (!originalItem.description && currentItem.description) {
    originalItem.description = currentItem.description
  }

  if (!originalItem.name && currentItem.name) {
    originalItem.name = currentItem.name
  }

  return originalItem
}
