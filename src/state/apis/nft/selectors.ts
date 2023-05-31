import type { AssetId } from '@shapeshiftoss/caip'
import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'
import { selectAssetIdParamFromFilter } from 'state/selectors'
import { selectWalletId } from 'state/slices/common-selectors'

export const selectSelectedNftAvatar = createSelector(
  selectWalletId,
  (state: ReduxState) => state.nft.selectedNftAvatarByWalletId,
  (walletId, selectedNftAvatarByWalletId): AssetId => {
    return selectedNftAvatarByWalletId[walletId ?? ''] ?? null
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

export const selectNftById = createSelector(
  selectNfts,
  selectAssetIdParamFromFilter,
  (nfts, nftAssetId) => {
    if (!nftAssetId) return null
    return nfts.byId[nftAssetId]
  },
)

export const selectSelectedNftAvatarUrl = createSelector(
  selectSelectedNftAvatar,
  selectNfts,
  (nftAssetId, nfts): string | null => {
    const nftItem = nfts.byId[nftAssetId ?? '']

    const media: string | undefined = nftItem?.medias[0]?.originalUrl

    return media ?? null
  },
)
