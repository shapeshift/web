import type { AssetNamespace, ChainId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { NftContract, OpenSeaCollectionMetadata, OwnedNft } from 'alchemy-sdk'
import { getMediaType } from 'state/apis/zapper/validators'

import type { NftCollectionItem, NftItem } from '../types'

const makeSocialLinks = (openseaCollectionMetadata: OpenSeaCollectionMetadata | undefined) => {
  if (!openseaCollectionMetadata) return []

  const socialLinks = [
    ...(openseaCollectionMetadata.twitterUsername
      ? [
          {
            name: 'Twitter',
            label: 'Twitter',
            url: `https://twitter.com/${openseaCollectionMetadata.twitterUsername}`,
            logoUrl: '',
          },
        ]
      : []),
    ...(openseaCollectionMetadata.discordUrl
      ? [
          {
            name: 'Discord',
            label: 'Discord',
            url: openseaCollectionMetadata.discordUrl,
            logoUrl: '',
          },
        ]
      : []),
    ...(openseaCollectionMetadata.externalUrl
      ? [
          {
            name: 'Website',
            label: 'Website',
            url: openseaCollectionMetadata.externalUrl,
            logoUrl: '',
          },
        ]
      : []),
  ]

  return socialLinks
}

export const parseAlchemyNftContractToCollectionItem = (
  contract: NftContract,
  chainId: ChainId,
): NftCollectionItem => {
  const { name, openSea } = contract

  const socialLinks = makeSocialLinks(openSea)
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

export const parseAlchemyOwnedNftToNftItem = (
  alchemyOwnedNft: OwnedNft,
  chainId: ChainId,
): NftItem => {
  const collectionId = toAssetId({
    assetReference: alchemyOwnedNft.contract.address,
    assetNamespace: alchemyOwnedNft.contract.tokenType.toLowerCase() as AssetNamespace,
    chainId,
  })
  const socialLinks = makeSocialLinks(alchemyOwnedNft.contract.openSea)

  const nftCollectionItem = {
    id: collectionId,
    chainId,
    name:
      alchemyOwnedNft.contract.name ||
      alchemyOwnedNft.contract.openSea?.collectionName ||
      'Collection',
    floorPrice: alchemyOwnedNft.contract.openSea?.floorPrice
      ? bnOrZero(alchemyOwnedNft.contract.openSea.floorPrice).toString()
      : null,
    openseaId: null, // The Alchemy NFT data does not have an openseaId
    description: alchemyOwnedNft.contract.openSea?.description || null,
    socialLinks,
  }

  const nftItem = {
    id: alchemyOwnedNft.tokenId,
    name:
      alchemyOwnedNft.title ||
      alchemyOwnedNft.contract.name ||
      alchemyOwnedNft.contract.openSea?.collectionName ||
      '',
    price: null, // The Alchemy NFT data does not have a spot price
    chainId,
    description: alchemyOwnedNft.description || null,
    collection: nftCollectionItem,
    medias: alchemyOwnedNft.media.map(media => ({
      originalUrl: media.gateway,
      type: getMediaType(media.gateway) || 'image', // Gateway URLs are not guaranteed to have a file extension
    })),
    rarityRank: null,
  }

  return nftItem
}
