import type { AssetId } from '@shapeshiftoss/caip'
import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'
import { selectWalletId } from 'state/slices/common-selectors'

import type { NftItemWithCollection } from './types'

const selectNfts = (state: ReduxState) => state.nft.nfts.byId
const selectNftCollections = (state: ReduxState) => state.nft.collections.byId

export const selectNftItemsWithCollection = createSelector(
  selectNfts,
  selectNftCollections,
  (nfts, collections): NftItemWithCollection[] => {
    return Object.values(nfts).reduce<NftItemWithCollection[]>((acc, nft) => {
      if (!nft) return acc
      const collection = collections[nft.collectionId]
      if (!collection) return acc

      const nftItemWithCollection = Object.assign({}, nft, { collection })

      acc.push(nftItemWithCollection)

      return acc
    }, [])
  },
)

export const selectNftCollectionById = createSelector(
  selectNftCollections,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (collections, collectionAssetId) => {
    if (!collectionAssetId) return null
    return collections[collectionAssetId]
  },
)

export const selectNftById = createSelector(
  selectNfts,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (nfts, nftAssetId) => {
    if (!nftAssetId) return null
    return nfts[nftAssetId]
  },
)

export const selectSelectedNftAvatar = createSelector(
  selectWalletId,
  (state: ReduxState) => state.nft.selectedNftAvatarByWalletId,
  (walletId, selectedNftAvatarByWalletId): AssetId => {
    return selectedNftAvatarByWalletId[walletId ?? ''] ?? null
  },
)
export const selectSelectedNftAvatarUrl = createSelector(
  selectSelectedNftAvatar,
  selectNfts,
  (nftAssetId, nfts): string | null => {
    const nftItem = nfts[nftAssetId ?? '']

    const media: string | undefined = nftItem?.medias[0]?.originalUrl

    return media ?? null
  },
)
