import type { AssetId } from '@keepkey/caip'
import { thorchainAssetId } from '@keepkey/caip'
import type { HistoryData } from '@keepkey/types'
import intersection from 'lodash/intersection'
import { useSelector } from 'react-redux'
import { selectAssets } from 'state/slices/selectors'

import type { BalanceChartData } from './useBalanceChartData'

/**
 * these assets have events that modify a balance that we can't currently detect
 */
export const CHART_ASSET_ID_BLACKLIST: AssetId[] = [
  thorchainAssetId, // swaps into native RUNE are events without an associated tx on chain. note erc20 RUNE is unaffected.
]

export const makeBalanceChartData = (total: HistoryData[] = []): BalanceChartData => ({
  total,
  rainbow: [],
})

export const useUnavailableBalanceChartDataAssetNames = (assetIds: AssetId[]): string => {
  const assets = useSelector(selectAssets)
  return intersection(assetIds, CHART_ASSET_ID_BLACKLIST)
    .map(assetId => assets[assetId].name)
    .join(', ')
}

export const useIsBalanceChartDataUnavailable = (assetIds: AssetId[]): boolean => {
  const unavailableBalanceChartDataAssetNames = useUnavailableBalanceChartDataAssetNames(assetIds)
  return Boolean(unavailableBalanceChartDataAssetNames)
}
