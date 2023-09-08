import type { AssetNamespace, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, polygonChainId, toAccountId, toAssetId } from '@shapeshiftoss/caip'
import type { TokenType } from '@shapeshiftoss/unchained-client/src/evm/ethereum'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Nft, NftContract, OpenSeaCollectionMetadata, OwnedNft } from 'alchemy-sdk'
import axios from 'axios'
import { http as v1HttpApi } from 'plugins/polygon'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getMediaType } from 'state/apis/zapper/validators'

import type { ERC721Metadata, NftCollectionType, NftItemWithCollection } from '../types'

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
  alchemyNft: (OwnedNft | Nft) & { ownerAddress?: string },
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

  const getMaybeMediasIpfsGatewayUrl = async (): Promise<
    Result<{ originalUrl: string; type: string }[], string>
  > => {
    try {
      // Unable to fetch media from an IPFS gateway, use alchemy media collection
      // which may be stale, but is our best bet
      if (!shouldFetchIpfsGatewayMediaUrl)
        return Ok(
          alchemyNft.media.map(media => ({
            originalUrl: media.gateway,
            type: getMediaType(`media.${media.format}`) ?? 'image',
          })),
        )

      // Get unchained meta if Polygon node is alive
      const tokenMetadata = await v1HttpApi.getTokenMetadata({
        contract: alchemyNft.contract.address,
        id: alchemyNft.tokenId,
        type: alchemyNft.contract.tokenType.toLowerCase() as TokenType,
      })

      return Ok([
        {
          originalUrl: tokenMetadata.media.url.replace(
            'ipfs://',
            'https://gateway.shapeshift.com/ipfs/',
          ),
          type: 'image',
        },
      ])
    } catch (error) {
      console.error(error)

      const ipnsMetadataUrl = alchemyNft.tokenUri?.gateway

      if (!ipnsMetadataUrl) return Err('No IPNS metadata gateway URL found')

      const { data } = await axios.get<ERC721Metadata>(ipnsMetadataUrl)

      if (!data) return Err('Cannot get metadata from IPNS gateway')

      const image = data.image.replace('ipfs://', 'https://gateway.shapeshift.com/ipfs/')

      return Ok([
        {
          originalUrl: image,
          type: 'image',
        },
      ])
    }
  }
  const maybeMedias = await getMaybeMediasIpfsGatewayUrl()

  if (maybeMedias.isErr()) {
    throw new Error('Cannot fetch medias, bailing from NFT parsing')
  }

  const medias = maybeMedias.unwrap()

  const maybeBalance =
    alchemyNft.tokenType.toLowerCase() === ASSET_NAMESPACE.erc1155
      ? { balance: bnOrZero((alchemyNft as OwnedNft).balance).toString() }
      : {}

  const nftItem = {
    id: alchemyNft.tokenId,
    assetId: toAssetId({
      assetReference: `${alchemyNft.contract.address}/${alchemyNft.tokenId}`,
      assetNamespace: alchemyNft.contract.tokenType.toLowerCase() as AssetNamespace,
      chainId,
    }),
    ownerAccountId: alchemyNft.ownerAddress
      ? toAccountId({
          account: alchemyNft.ownerAddress,
          chainId,
        })
      : '',
    symbol: alchemyNft.contract.symbol ?? '',
    ...maybeBalance,
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
