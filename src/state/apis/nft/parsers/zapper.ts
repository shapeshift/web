import type { ChainId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type { AssetNamespace } from '@shapeshiftoss/caip/src/assetId/assetId'
import type { V2NftUserItem } from 'state/apis/zapper/validators'

import type { NftCollectionType, NftItem } from '../types'

export const parseToNftItem = (zapperItem: V2NftUserItem, chainId: ChainId): NftItem => {
  const {
    token,
    token: { lastSaleEth, medias, tokenId },
    token: { collection },
  } = zapperItem

  const collectionItem: NftCollectionType = {
    id: collection?.address
      ? toAssetId({
          assetReference: collection.address,
          assetNamespace: collection.nftStandard as AssetNamespace,
          chainId,
        })
      : '',
    chainId,
    description: '', // Not supported by the /v2/nft/user/tokens endpoint
    name: collection?.name || '',
    floorPrice: collection?.floorPriceEth || '',
    openseaId: collection?.openseaId || '',
    socialLinks: [], // Not supported by the /v2/nft/user/tokens endpoint
  }

  const nftItem: NftItem = {
    id: tokenId,
    name: token.name,
    description: '', // Not supported by the /v2/nft/user/tokens endpoint
    price: lastSaleEth || '',
    chainId,
    collection: collectionItem,
    medias,
    rarityRank: token.rarityRank,
  }

  return nftItem
}
