import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import { selectSearchQueryFromFilter } from '../selectors'
import type { AggregatedOpportunitiesByProviderReturn } from './opportunitiesSlice/types'
import { selectAggregatedEarnOpportunitiesByProvider, selectAssetsBySearchQuery } from './selectors'

export enum GlobalSearchResultType {
  Asset = 'Asset',
  LpOpportunity = 'LpOpportunity',
  StakingOpportunity = 'StakingOpportunity',
}

export type GlobalSearchResult = {
  type: GlobalSearchResultType
  id: AssetId
}

export const selectGlobalItemsFromFilter = createDeepEqualOutputSelector(
  selectAssetsBySearchQuery,
  selectAggregatedEarnOpportunitiesByProvider,
  selectSearchQueryFromFilter,
  (filteredAssets: Asset[], opportunityResults, query?: string): GlobalSearchResult[] => {
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

    const stakingOpportunities = Array.from(new Set(opportunities.staking)).map(id => {
      return {
        type: GlobalSearchResultType.StakingOpportunity,
        id,
      }
    })
    const lpOpportunities = Array.from(new Set(opportunities.lp)).map(id => {
      return {
        type: GlobalSearchResultType.LpOpportunity,
        id,
      }
    })
    return resultAssets.concat(stakingOpportunities).concat(lpOpportunities)
  },
)
