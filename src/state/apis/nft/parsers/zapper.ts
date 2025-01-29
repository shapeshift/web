import type { AssetNamespace, ChainId } from '@shapeshiftoss/caip'
import { toAccountId, toAssetId } from '@shapeshiftoss/caip'
import type { V2NftUserItem } from 'state/apis/zapper/validators'

import type { NftCollectionType, NftItemWithCollection } from '../types'

export const parseToNftItem = (
  zapperItem: V2NftUserItem & { ownerAddress: string },
  chainId: ChainId,
): NftItemWithCollection => {
  const {
    token: { name, rarityRank, lastSaleEth, medias, tokenId, collection },
  } = zapperItem

  const collectionItem: NftCollectionType = {
    assetId: toAssetId({
      assetReference: collection.address,
      assetNamespace: collection.nftStandard as AssetNamespace,
      chainId,
    }),
    chainId,
    description: '', // Not supported by the /v2/nft/user/tokens endpoint
    name: collection?.name ?? '',
    floorPrice: collection?.floorPriceEth ?? '',
    openseaId: collection?.openseaId ?? '',
    socialLinks: [], // Not supported by the /v2/nft/user/tokens endpoint
  }

  const nftItem: NftItemWithCollection = {
    id: tokenId,
    ownerAccountId: toAccountId({
      chainId,
      account: zapperItem.ownerAddress,
    }),
    assetId: toAssetId({
      assetReference: `${collection.address}/${tokenId}`,
      assetNamespace: collection.nftStandard as AssetNamespace,
      chainId,
    }),
    name,
    description: '', // Not supported by the /v2/nft/user/tokens endpoint
    price: lastSaleEth ?? '',
    chainId,
    collection: collectionItem,
    medias: medias.filter(media => media.originalUrl),
    rarityRank,
    symbol: '', // Zapper doesn't provide this
  }

  return nftItem
}
