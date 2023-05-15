import type { AssetId } from '@shapeshiftoss/caip'
import { uniq } from 'lodash'
import type { Asset } from 'lib/asset-service'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import { selectSearchQueryFromFilter } from '../selectors'
import type {
  AggregatedOpportunitiesByProviderReturn,
  OpportunityId,
} from './opportunitiesSlice/types'
import {
  selectAggregatedEarnOpportunitiesByProvider,
  selectAssetsBySearchQuery,
  selectTxsByQuery,
} from './selectors'
import type { TxId } from './txHistorySlice/txHistorySlice'

export enum GlobalSearchResultType {
  Asset = 'Asset',
  LpOpportunity = 'LpOpportunity',
  StakingOpportunity = 'StakingOpportunity',
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

export type OpportunitySearchResult = {
  type: GlobalSearchResultType.LpOpportunity | GlobalSearchResultType.StakingOpportunity
  id: OpportunityId
}

export type SendResult = {
  type: GlobalSearchResultType.Send
  id: AssetId
  address: string
  vanityAddress: string
}

export type GlobalSearchResult =
  | AssetSearchResult
  | TxSearchResult
  | OpportunitySearchResult
  | SendResult

export type SelectGlobalItemsFromFilterReturn = [
  AssetSearchResult[],
  OpportunitySearchResult[],
  OpportunitySearchResult[],
  TxSearchResult[],
]

export const selectGlobalItemsFromFilter = createDeepEqualOutputSelector(
  selectAssetsBySearchQuery,
  selectAggregatedEarnOpportunitiesByProvider,
  selectTxsByQuery,
  selectSearchQueryFromFilter,
  (
    filteredAssets: Asset[],
    opportunityResults,
    txIds,
    query?: string,
  ): SelectGlobalItemsFromFilterReturn => {
    const limit = query ? 10 : 3
    const resultAssets: AssetSearchResult[] = filteredAssets
      .map(asset => {
        return {
          type: GlobalSearchResultType.Asset as const,
          id: asset.assetId,
        }
      })
      .slice(0, limit)
    const opportunities = opportunityResults.reduce(
      (acc: { staking: string[]; lp: string[] }, curr: AggregatedOpportunitiesByProviderReturn) => {
        acc['staking'] = acc['staking'].concat(curr.opportunities.staking)
        acc['lp'] = acc['lp'].concat(curr.opportunities.lp)
        return acc
      },
      { staking: [], lp: [] },
    )

    const stakingOpportunities: OpportunitySearchResult[] = uniq(opportunities.staking)
      .map(id => {
        return {
          type: GlobalSearchResultType.StakingOpportunity as const,
          id,
        }
      })
      .slice(0, limit)
    const lpOpportunities: OpportunitySearchResult[] = uniq(opportunities.lp)
      .map(id => {
        return {
          type: GlobalSearchResultType.LpOpportunity as const,
          id,
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
    return [resultAssets, stakingOpportunities, lpOpportunities, txResults]
  },
)
