import type { AssetId } from '@shapeshiftoss/caip'
import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'
import { selectWalletId } from 'state/slices/common-selectors'

import type { NftCollectionType, NftItem, NftItemWithCollection } from './types'

const selectNfts = (state: ReduxState) => state.nft.nfts.byId
const selectNftCollections = (state: ReduxState) => state.nft.collections.byId

// TODO(gomes): We can't consume this yet, see the PR description of https://github.com/shapeshift/web/pull/4597
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
  (collections, collectionAssetId): NftCollectionType | undefined => {
    if (!collectionAssetId) return

    return collections[collectionAssetId]
  },
)

export const selectNftById = createSelector(
  selectNfts,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (nfts, nftAssetId): NftItem | undefined => {
    if (!nftAssetId) return

    return nfts[nftAssetId]
  },
)

export const selectSelectedNftAvatar = createSelector(
  selectWalletId,
  (state: ReduxState) => state.nft.selectedNftAvatarByWalletId,
  (walletId, selectedNftAvatarByWalletId): AssetId | undefined => {
    return selectedNftAvatarByWalletId[walletId ?? '']
  },
)

export const selectSelectedNftAvatarUrl = createSelector(
  selectSelectedNftAvatar,
  selectNfts,
  (nftAssetId, nfts): string | undefined => {
    const nftItem = nfts[nftAssetId ?? '']

    const media = nftItem?.medias[0]?.originalUrl

    return media
  },
)
