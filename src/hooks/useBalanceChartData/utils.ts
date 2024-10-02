import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryData } from '@shapeshiftoss/types'
import intersection from 'lodash/intersection'
import { useSelector } from 'react-redux'
import { selectAssets } from 'state/slices/selectors'

import type { BalanceChartData } from './useBalanceChartData'

/**
 * these assets have events that modify a balance that we can't currently detect
 */
export const CHART_ASSET_ID_BLACKLIST: AssetId[] = []

export const makeBalanceChartData = (total: HistoryData[] = []): BalanceChartData => ({
  total,
  rainbow: [],
})

export const useUnavailableBalanceChartDataAssetNames = (assetIds: AssetId[]): string => {
  const assets = useSelector(selectAssets)
  return intersection(assetIds, CHART_ASSET_ID_BLACKLIST)
    .map(assetId => assets[assetId]?.name)
    .join(', ')
}
