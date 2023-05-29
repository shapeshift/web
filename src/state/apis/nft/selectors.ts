import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'
import { selectWalletId } from 'state/slices/common-selectors'

export const selectSelectedNftAvatar = createSelector(
  selectWalletId,
  (state: ReduxState) => state.nft.selectedNftAvatarByWalletId,
  (walletId, selectedNftAvatarByWalletId) => {
    return selectedNftAvatarByWalletId[walletId ?? '']
  },
)

const selectNfts = (state: ReduxState) => state.nft.nfts

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
