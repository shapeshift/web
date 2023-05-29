import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'
import { selectAssetIdParamFromFilter } from 'state/selectors'
import { selectWalletId } from 'state/slices/common-selectors'

export const selectSelectedNftAvatar = createSelector(
  selectWalletId,
  (state: ReduxState) => state.nft.selectedNftAvatarByWalletId,
  (walletId, selectedNftAvatarByWalletId) => {
    return selectedNftAvatarByWalletId[walletId ?? '']
  },
)

const selectNfts = (state: ReduxState) => state.nft.nfts
const selectNftCollections = (state: ReduxState) => state.nft.collections

export const selectNftCollectionById = createSelector(
  selectNftCollections,
  selectAssetIdParamFromFilter,
  (collections, collectionAssetId) => {
    if (!collectionAssetId) return null
    return collections.byId[collectionAssetId]
  },
)

export const selectSelectedNftAvatarUrl = createSelector(
  selectSelectedNftAvatar,
  selectNfts,
  (nftAssetId, nfts) => {
    if (!nftAssetId) return null
    const nftItem = nfts.byId[nftAssetId]
    const media = nftItem.medias[0]?.originalUrl

    return media
  },
)
