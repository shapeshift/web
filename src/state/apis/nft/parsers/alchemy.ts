import type { AssetNamespace, ChainId } from '@shapeshiftoss/caip'
import { polygonChainId, toAssetId } from '@shapeshiftoss/caip'
import type { TokenType } from '@shapeshiftoss/unchained-client/src/evm/ethereum'
import type { Nft, NftContract, OpenSeaCollectionMetadata, OwnedNft } from 'alchemy-sdk'
import { http as v1HttpApi } from 'plugins/polygon'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getMediaType } from 'state/apis/zapper/validators'

import type { NftCollectionType, NftItemWithCollection } from '../types'

const makeSocialLinks = (openseaCollectionMetadata: OpenSeaCollectionMetadata | undefined) => {
  if (!openseaCollectionMetadata) return []

  const socialLinks = [
    ...(openseaCollectionMetadata.twitterUsername
      ? [
          {
            key: 'Twitter',
            displayName: 'Twitter',
            url: `https://twitter.com/${openseaCollectionMetadata.twitterUsername}`,
          },
        ]
      : []),
    ...(openseaCollectionMetadata.discordUrl
      ? [
          {
            key: 'Discord',
            displayName: 'Discord',
            url: openseaCollectionMetadata.discordUrl,
          },
        ]
      : []),
    ...(openseaCollectionMetadata.externalUrl
      ? [
          {
            key: 'Website',
            displayName: 'Website',
            url: openseaCollectionMetadata.externalUrl,
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
  const assetId = toAssetId({
    assetReference: contract.address,
    assetNamespace: contract.tokenType.toLowerCase() as AssetNamespace,
    chainId,
  })

  return {
    assetId,
    chainId,
    name: name ?? '',
    floorPrice: openSea?.floorPrice ? bnOrZero(openSea.floorPrice).toString() : '',
    openseaId: '', // not supported by Alchemy
    description: openSea?.description ?? '',
    socialLinks,
  }
}

export const parseAlchemyNftToNftItem = async (
  alchemyNft: OwnedNft | Nft,
  chainId: ChainId,
): Promise<NftItemWithCollection> => {
  const collectionId = toAssetId({
    assetReference: alchemyNft.contract.address,
    assetNamespace: alchemyNft.contract.tokenType.toLowerCase() as AssetNamespace,
    chainId,
  })
  const socialLinks = makeSocialLinks(alchemyNft.contract.openSea)

  const nftCollection = {
    assetId: collectionId,
    chainId,
    name: alchemyNft.contract.name || alchemyNft.contract.openSea?.collectionName || 'Collection',
    floorPrice: '', // Seemingly unreliable
    openseaId: '', // The Alchemy NFT data does not have an openseaId
    description: alchemyNft.contract.openSea?.description ?? '',
    socialLinks,
  }

  // If we have an IPNS gateway metadata URL, it means unchained can get a fresh media URL
  // Which allows us to circumvent Alchemy refresh working for Ethereum only
  // Notes:
  // - We're only able to get fresh meta from unchained for IPNS URLs, not IPFS ones
  // - This hasn't been tested on Optimism, hence we only support this refresh for Polygon for now
  const shouldFetchIpfsGatewayMediaUrl =
    chainId === polygonChainId && alchemyNft.tokenUri?.gateway.includes('ipns')

  const getMediaIpfsGatewayUrl = async () =>
    (
      await v1HttpApi.getTokenMetadata({
        contract: alchemyNft.contract.address,
        id: alchemyNft.tokenId,
        type: alchemyNft.contract.tokenType.toLowerCase() as TokenType,
      })
    ).media.url.replace('ipfs://', 'https://ipfs.io/ipfs/') // TODO: https://gateway.shapeshift.com/ipfs/ when stabilized

  const medias = shouldFetchIpfsGatewayMediaUrl
    ? [{ originalUrl: await getMediaIpfsGatewayUrl(), type: 'image' }] // assume image for IPNS media URLs for now
    : alchemyNft.media.map(media => ({
        originalUrl: media.gateway,
        type: getMediaType(`media.${media.format}`) ?? 'image',
      }))

  const nftItem = {
    id: alchemyNft.tokenId,
    assetId: toAssetId({
      assetReference: `${alchemyNft.contract.address}/${alchemyNft.tokenId}`,
      assetNamespace: alchemyNft.contract.tokenType.toLowerCase() as AssetNamespace,
      chainId,
    }),
    name:
      (alchemyNft.title ||
        alchemyNft.contract.name ||
        alchemyNft.contract.openSea?.collectionName) ??
      '',
    price: '', // The Alchemy NFT data does not have a spot price
    chainId,
    description: alchemyNft.description,
    collection: nftCollection,
    medias,
    rarityRank: null,
  }

  return nftItem
}
