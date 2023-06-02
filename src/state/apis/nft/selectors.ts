import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'
import { selectWalletId } from 'state/slices/common-selectors'

import { nftApi } from './nftApi'
import type { NftCollectionType, NftItem, NftItemWithCollection } from './types'

const selectNfts = (state: ReduxState) => state.nft.nfts.byId
const selectNftCollections = (state: ReduxState) => state.nft.collections.byId

// Would be nice if this was normalized as well but we can't, See the PR description of https://github.com/shapeshift/web/pull/4597
// TODO(gomes): normalize me
export const makeSelectNftItemsWithCollectionSelector = (accountIds: AccountId[]) => {
  const selectGetNftUserTokens = nftApi.endpoints.getNftUserTokens.select({ accountIds })

  return createSelector(
    selectGetNftUserTokens,
    selectNftCollections,
    (nftUserTokens, collections): NftItemWithCollection[] => {
      const { data: nfts } = nftUserTokens
      if (!nfts) return []

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
}

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
