import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { createDeepEqualOutputSelector, selectSearchQueryFromFilter } from 'state/selectors/utils'
import { selectAssetsBySearchQuery } from 'state/slices/assetsSlice/selectors'
import { selectTxsByQuery } from 'state/slices/txHistorySlice/selectors'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'

export enum GlobalSearchResultType {
  Asset = 'Asset',
  Transaction = 'Transaction',
  Send = 'Send',
}

export type AssetSearchResult = {
  type: GlobalSearchResultType.Asset
  id: AssetId
}

export type TxSearchResult = {
  type: GlobalSearchResultType.Transaction
  id: TxId
}

export type SendResult = {
  type: GlobalSearchResultType.Send
  id: AssetId
  address: string
  vanityAddress: string
}

export type GlobalSearchResult = AssetSearchResult | TxSearchResult | SendResult

export type SelectGlobalItemsFromFilterReturn = [AssetSearchResult[], TxSearchResult[]]

export const selectGlobalItemsFromFilter = createDeepEqualOutputSelector(
  selectAssetsBySearchQuery,
  selectTxsByQuery,
  selectSearchQueryFromFilter,
  (filteredAssets: Asset[], txIds, query?: string): SelectGlobalItemsFromFilterReturn => {
    const limit = query ? 10 : 3
    const resultAssets: AssetSearchResult[] = filteredAssets
      .map(asset => {
        return {
          type: GlobalSearchResultType.Asset as const,
          id: asset.assetId,
        }
      })
      .slice(0, limit)
    const txResults: TxSearchResult[] = txIds
      .map(id => {
        return {
          type: GlobalSearchResultType.Transaction as const,
          id,
        }
      })
      .slice(0, limit)
    return [resultAssets, txResults]
  },
)
