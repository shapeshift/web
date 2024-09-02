import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  bscChainId,
  deserializeNftAssetReference,
  ethChainId,
  foxatarAssetId,
  fromAccountId,
  fromAssetId,
  optimismChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import cloneDeep from 'lodash/cloneDeep'
import invert from 'lodash/invert'
import { getAlchemyInstanceByChainId } from 'lib/alchemySdkInstance'
import { isFulfilled } from 'lib/utils'

import {
  parseAlchemyNftContractToCollectionItem,
  parseAlchemyNftToNftItem,
} from './parsers/alchemy'
import type { NftCollectionType, NftItemWithCollection } from './types'

// addresses are repeated across EVM chains
export const accountIdsToEvmAddresses = (accountIds: AccountId[]): string[] =>
  Array.from(
    new Set(
      accountIds
        .map(fromAccountId)
        .filter(({ chainId }) => evm.isEvmChainId(chainId))
        .map(({ account }) => account),
    ),
  )

export enum SupportedOpenseaNetwork {
  Polygon = 'matic',
  Optimism = 'optimism',
  Ethereum = 'ethereum',
  BinanceSmartChain = 'bsc',
  Avalanche = 'avalanche',
  Arbitrum = 'arbitrum',
  // Klaytn = 'klaytn',
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
  [SupportedOpenseaNetwork.Arbitrum]: arbitrumChainId,
} as const

export const CHAIN_ID_TO_OPENSEA_NETWORK_MAP = invert(OPENSEA_NETWORKS_TO_CHAIN_ID_MAP) as Partial<
  Record<ChainId, SupportedOpenseaNetwork>
>

export const openseaNetworkToChainId = (network: SupportedOpenseaNetwork): ChainId | undefined =>
  OPENSEA_NETWORKS_TO_CHAIN_ID_MAP[network]

export const chainIdToOpenseaNetwork = (chainId: ChainId): SupportedOpenseaNetwork | undefined =>
  CHAIN_ID_TO_OPENSEA_NETWORK_MAP[chainId]

export const updateNftItem = (
  _originalItem: NftItemWithCollection,
  currentItem: NftItemWithCollection,
) => {
  const originalItem = cloneDeep(_originalItem)
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

  if (!originalItem.symbol && currentItem.symbol) {
    originalItem.symbol = currentItem.symbol
  }

  if (!originalItem.ownerAccountId && currentItem.ownerAccountId) {
    originalItem.ownerAccountId = currentItem.ownerAccountId
  }

  return originalItem
}

export const updateNftCollection = (
  originalItem: NftCollectionType,
  currentItem: NftCollectionType,
) => {
  const draftItem = Object.assign({}, originalItem)
  // The original description we're getting from the NFT item might not be the "best" version (i.e with emojis, links etc)
  // so we want to update it with the one from the collection if it exists
  draftItem.description = currentItem.description ?? originalItem.description
  draftItem.name = originalItem.name ?? currentItem.name
  draftItem.floorPrice = originalItem.floorPrice ?? currentItem.floorPrice
  draftItem.openseaId = originalItem.openseaId ?? currentItem.openseaId
  draftItem.socialLinks = originalItem.socialLinks.length
    ? originalItem.socialLinks
    : currentItem.socialLinks
  if (
    currentItem.assetId === foxatarAssetId &&
    !draftItem.socialLinks.find(({ key: name }) => name === 'customizeFoxatar')
  ) {
    draftItem.socialLinks.push({
      key: 'customizeFoxatar',
      displayName: '',
      url: 'https://app.mercle.xyz/shapeshift',
    })
  }
  draftItem.isSpam = currentItem.isSpam

  return draftItem
}

export const getAlchemyNftsUserData = async (
  accountIds: AccountId[],
): Promise<{ data: NftItemWithCollection[] }> => {
  const items = (
    await Promise.allSettled(
      accountIds.map(async accountId => {
        const { account: address, chainId } = fromAccountId(accountId)

        const alchemy = getAlchemyInstanceByChainId(chainId)
        const { ownedNfts } = await alchemy.nft.getNftsForOwner(
          address,
          // {
          // spam filter only supported for Ethereum and Polygon
          // We can't use this unless we upgrade to a higher plan.
          // excludeFilters: [KnownChainIds.EthereumMainnet, KnownChainIds.PolygonMainnet].includes(
          // chainId as KnownChainIds,
          // )
          // ? [NftFilters.SPAM]
          // : [],
          // }
        )
        return Promise.all(
          ownedNfts.map(ownedNft =>
            parseAlchemyNftToNftItem(Object.assign(ownedNft, { ownerAddress: address }), chainId),
          ),
        )
      }),
    )
  )
    .filter(isFulfilled)
    .flatMap(({ value }) => value)

  return { data: items }
}

export const getAlchemyCollectionData = async (
  collectionId: AssetId,
): Promise<{ data: NftCollectionType }> => {
  const { assetReference: collectionAddress, chainId } = fromAssetId(collectionId)

  const alchemy = getAlchemyInstanceByChainId(chainId)
  const collectionContractMetadata = await alchemy.nft.getContractMetadata(collectionAddress)

  return { data: parseAlchemyNftContractToCollectionItem(collectionContractMetadata, chainId) }
}

// Gets NFT with metadata reinstated in Alchemy - only use for NFTs we explicitly want fresh metadata for
// i.e FOXatar refresh on customization update
export const getAlchemyNftData = async (
  assetId: AssetId,
): Promise<{ data: NftItemWithCollection }> => {
  const { chainId, assetReference } = fromAssetId(assetId)
  const [address, tokenId] = deserializeNftAssetReference(assetReference)
  const alchemy = getAlchemyInstanceByChainId(chainId)
  // NOTE: refreshCache is actually rugged for Polygon, see parseAlchemyNftToNftItem to see how we circumvent this
  const nft = await alchemy.nft.getNftMetadata(address, tokenId, { refreshCache: true })

  const parsedNft = await parseAlchemyNftToNftItem(nft, chainId)

  return { data: parsedNft }
}
