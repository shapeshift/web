import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { uniq } from 'lodash'
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
}

type AssetSearchResult = {
  type: GlobalSearchResultType.Asset
  id: AssetId
}

type TxSearchResult = {
  type: GlobalSearchResultType.Transaction
  id: TxId
}

type OpportunitySearchResult = {
  type: GlobalSearchResultType.LpOpportunity | GlobalSearchResultType.StakingOpportunity
  id: OpportunityId
}

export type GlobalSearchResult = AssetSearchResult | TxSearchResult | OpportunitySearchResult

export const selectGlobalItemsFromFilter = createDeepEqualOutputSelector(
  selectAssetsBySearchQuery,
  selectAggregatedEarnOpportunitiesByProvider,
  selectTxsByQuery,
  selectSearchQueryFromFilter,
  (filteredAssets: Asset[], opportunityResults, txIds, query?: string): GlobalSearchResult[] => {
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
        acc['staking'].concat(curr.opportunities.staking)
        acc['lp'].concat(curr.opportunities.lp)
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
    const result: GlobalSearchResult[] = []
    return result
      .concat(resultAssets)
      .concat(stakingOpportunities)
      .concat(lpOpportunities)
      .concat(txResults)
  },
)
