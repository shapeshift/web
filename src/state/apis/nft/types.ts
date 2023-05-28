import type { AssetId, ChainId } from '@shapeshiftoss/caip'

import type { MediaUrl } from '../zapper/validators'

export type NftCollectionType = {
  // The AssetId of the collection, which doesn't exist as an assetSlice asset yet (https://github.com/shapeshift/web/pull/4555)
  // Note, depending on the endpoint being hit, we may or may not be able to get an actual collection AssetId
  id: AssetId | null
  chainId: ChainId
  // The name of the collection, not the name of the NFT
  name: string
  // Denominated in the native asset of the NFT chain
  floorPrice: string
  openseaId: string
  description: string
  socialLinks: {
    name: string
    label: string
    url: string
    logoUrl: string
  }[]
}

export type NftItem = {
  // the ID of the actual token in the collection, not a Zapper/Covalent/Opensea ID internal ID, and not an AssetId either
  id: string
  name: string // the name for this specific ID, should always be defined
  // The spot price of the NFT in crypto, denominated in the native asset of the NFT chain
  price: string
  chainId: ChainId
  description: string
  // Not normalized as collectionId, we can't join since we don't store this normalized *yet*
  // Once we split nft/nftApi, this can be collectionId and then join'd with the collection data
  collection: NftCollectionType
  medias: MediaUrl[]
  rarityRank: number | null
}
