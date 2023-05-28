import { QueryStatus } from '@reduxjs/toolkit/dist/query/react'
import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'
import { selectWalletId } from 'state/slices/common-selectors'

import type { NftItem } from './types'

const selectSelectedNftAvatar = createSelector(
  selectWalletId,
  (state: ReduxState) => state.nft.selectedNftAvatarByWalletId,
  (walletId, selectedNftAvatarByWalletId) => {
    return selectedNftAvatarByWalletId[walletId ?? '']
  },
)

const selectNftUserTokensQueriesFulfilled = (state: ReduxState): NftItem[] =>
  Object.values(state.nftApi.queries)
    .filter(
      query =>
        query?.endpointName === 'getNftUserTokens' && query?.status === QueryStatus.fulfilled,
    )
    .flatMap(query => query?.data as NftItem)

export const selectSelectedNftAvatarUrl = createSelector(
  selectSelectedNftAvatar,
  selectNftUserTokensQueriesFulfilled,
  (nftAssetId, nftUserTokensQueries) => {
    if (!nftAssetId) return null
    const media = nftUserTokensQueries.find(nft => {
      const assetId = `${nft.collection.id}/${nft.id}`
      return assetId === nftAssetId
    })?.medias[0]?.originalUrl

    return media
  },
)
