import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'

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
  // The owner of the NFT item
  ownerAccountId: AccountId
  // An "NftItem" is not the representation of a "NFT Item" as thought by users, but of an NFT entity at a lower-level i.e a CAIP-22 (ERC721) or CAIP-29 (ERC1155) token
  // e.g eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d/771769 / eip155:1/erc1155:0x28959Cf125ccB051E70711D0924a62FB28EAF186/1
  // While ERC-721s do represent an actual NFT as thought by users, ERC-1155s are a bit different, as one contract can represent multiple NFTs, and each of these can have a balance
  balance?: string
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
  symbol: string
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
