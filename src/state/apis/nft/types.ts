import type { AssetId, ChainId } from '@shapeshiftoss/caip'

import type { MediaUrl } from '../zapper/validators'

export type NftCollectionType = {
  assetId: AssetId
  chainId: ChainId
  // The name of the collection, not the name of the NFT
  name: string
  // Denominated in the native asset of the NFT chain
  floorPrice: string
  openseaId: string
  description: string
  socialLinks: {
    key: string
    displayName: string
    url: string
  }[]
}

export type NftItem = {
  // the ID of the actual token in the collection, not a Zapper/Covalent/Opensea ID internal ID, and not an AssetId either
  id: string
  // the actual CAIP-22/29 of the asset
  assetId: AssetId
  name: string // the name for this specific ID, should always be defined
  // The spot price of the NFT in crypto, denominated in the native asset of the NFT chain
  price: string
  chainId: ChainId
  description: string
  // TODO(gomes): store the collection data into nft[collectionAssetId] and make this `collectionId`
  // we can then join the item and collection, once the collection is in the store as well
  collectionId: AssetId
  medias: MediaUrl[]
  rarityRank: number | null
}

export type NftItemWithCollection = Omit<NftItem, 'collectionId'> & {
  collection: NftCollectionType
}

// Standard ERC721 Metadata JSON Schema
// This is the very base from EIP-721, without extensions nor Opensea/LooksRare specific e.g animation_url
// https://eips.ethereum.org/EIPS/eip-721
export type ERC721Metadata = {
  name: string
  description: string
  image: string
}
