import { QueryStatus } from '@reduxjs/toolkit/query'
import type { AssetId } from '@shapeshiftoss/caip'
import { isNft } from '@shapeshiftoss/caip'
import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'
import {
  selectEndpointNameParamFromFilter,
  selectQueryStatusParamFromFilter,
} from 'state/selectors'
import { selectWalletId } from 'state/slices/common-selectors'
import { selectPortfolioAssetIds } from 'state/slices/selectors'

import type { NftCollectionType, NftItem, NftItemWithCollection } from './types'

const selectNfts = (state: ReduxState) => state.nft.nfts.byId
const selectNftCollections = (state: ReduxState) => state.nft.collections.byId
export const selectNftApiQueries = (state: ReduxState) => state.nftApi.queries

export const selectNftApiQueriesByEndpointAndStatus = createSelector(
  selectNftApiQueries,
  selectEndpointNameParamFromFilter,
  selectQueryStatusParamFromFilter,
  (queries, endpointName, status) =>
    Object.values(queries).filter(
      query =>
        (!endpointName || query?.endpointName === endpointName) &&
        (!status || query?.status === status),
    ),
)

export const selectGetNftUserTokensPending = createSelector(
  (state: ReduxState) =>
    selectNftApiQueriesByEndpointAndStatus(state, {
      endpointName: 'getNftUserTokens',
      queryStatus: QueryStatus.pending,
    }),
  queries => Boolean(queries.length),
)

export const selectPortfolioNftItemsWithCollection = createSelector(
  selectNfts,
  selectNftCollections,
  selectPortfolioAssetIds,
  (nftsById, collections, portfolioAssetIds): NftItemWithCollection[] => {
    const portfolioNftAssetIds = portfolioAssetIds.filter(isNft)

    return portfolioNftAssetIds.reduce<NftItemWithCollection[]>((acc, nftAssetId) => {
      if (!nftAssetId) return acc
      const nft = nftsById[nftAssetId]
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
