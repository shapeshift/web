import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { uniq } from 'lodash'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import { selectSearchQueryFromFilter } from '../selectors'
import type { AggregatedOpportunitiesByProviderReturn } from './opportunitiesSlice/types'
import {
  selectAggregatedEarnOpportunitiesByProvider,
  selectAssetsBySearchQuery,
  SelectTxsByQuery,
} from './selectors'

export enum GlobalSearchResultType {
  Asset = 'Asset',
  LpOpportunity = 'LpOpportunity',
  StakingOpportunity = 'StakingOpportunity',
  Transaction = 'Transaction',
}

export type GlobalSearchResult = {
  type: GlobalSearchResultType
  id: AssetId
}

export const selectGlobalItemsFromFilter = createDeepEqualOutputSelector(
  selectAssetsBySearchQuery,
  selectAggregatedEarnOpportunitiesByProvider,
  SelectTxsByQuery,
  selectSearchQueryFromFilter,
  (filteredAssets: Asset[], opportunityResults, txIds, query?: string): GlobalSearchResult[] => {
    if (!query) return []
    const resultAssets = filteredAssets
      .map(asset => {
        return {
          type: GlobalSearchResultType.Asset,
          id: asset.assetId,
        }
      })
      .slice(0, 10)
    const opportunities = opportunityResults.reduce(
      (acc: { staking: string[]; lp: string[] }, curr: AggregatedOpportunitiesByProviderReturn) => {
        acc['staking'].push(...curr.opportunities.staking)
        acc['lp'].push(...curr.opportunities.lp)
        return acc
      },
      { staking: [], lp: [] },
    )

    const stakingOpportunities = uniq(opportunities.staking).map(id => {
      return {
        type: GlobalSearchResultType.StakingOpportunity,
        id,
      }
    })
    const lpOpportunities = uniq(opportunities.lp).map(id => {
      return {
        type: GlobalSearchResultType.LpOpportunity,
        id,
      }
    })
    const txResults = txIds
      .map(id => {
        return {
          type: GlobalSearchResultType.Transaction,
          id,
        }
      })
      .slice(0, 10)
    return resultAssets.concat(stakingOpportunities).concat(lpOpportunities).concat(txResults)
  },
)
