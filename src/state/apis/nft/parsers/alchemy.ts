import type { AssetNamespace, ChainId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type { NftContract, OpenSeaCollectionMetadata, OwnedNft } from 'alchemy-sdk'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getMediaType } from 'state/apis/zapper/validators'

import type { NftCollectionType, NftItem } from '../types'

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
): NftCollectionType => {
  const { name, openSea } = contract

  const socialLinks = makeSocialLinks(openSea)
  const id = toAssetId({
    assetReference: contract.address,
    assetNamespace: contract.tokenType.toLowerCase() as AssetNamespace,
    chainId,
  })

  return {
    assetId: id,
    chainId,
    name: name ?? '',
    floorPrice: openSea?.floorPrice ? bnOrZero(openSea.floorPrice).toString() : '',
    openseaId: openSea?.collectionName ? openSea.collectionName : '',
    description: openSea?.description ?? '',
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

  const nftCollection = {
    assetId: collectionId,
    chainId,
    name:
      alchemyOwnedNft.contract.name ||
      alchemyOwnedNft.contract.openSea?.collectionName ||
      'Collection',
    floorPrice: '', // Seemingly unreliable
    openseaId: '', // The Alchemy NFT data does not have an openseaId
    description: alchemyOwnedNft.contract.openSea?.description ?? '',
    socialLinks,
  }

  const nftItem = {
    id: alchemyOwnedNft.tokenId,
    assetId: toAssetId({
      assetReference: `${alchemyOwnedNft.contract.address}/${alchemyOwnedNft.tokenId}`,
      assetNamespace: alchemyOwnedNft.contract.tokenType.toLowerCase() as AssetNamespace,
      chainId,
    }),
    name:
      (alchemyOwnedNft.title ||
        alchemyOwnedNft.contract.name ||
        alchemyOwnedNft.contract.openSea?.collectionName) ??
      '',
    price: '', // The Alchemy NFT data does not have a spot price
    chainId,
    description: alchemyOwnedNft.description,
    collection: nftCollection,
    medias: alchemyOwnedNft.media.map(media => ({
      originalUrl: media.gateway,
      type: getMediaType(media.gateway) ?? 'image', // Gateway URLs are not guaranteed to have a file extension
    })),
    rarityRank: null,
  }

  return nftItem
}
