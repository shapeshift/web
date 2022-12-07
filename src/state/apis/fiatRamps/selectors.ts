import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { uniq } from 'lodash'
import { createSelector } from 'reselect'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAssetIdParamFromFilter, selectFiatRampActionFromFilter } from 'state/selectors'
import { defaultMarketData } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectAssets, selectMarketData } from 'state/slices/selectors'

import { fiatRampApi } from './fiatRamps'

export const selectFiatBuyAssetIds = createDeepEqualOutputSelector(
  fiatRampApi.endpoints.getFiatRamps.select(),
  (fiatRampData): AssetId[] => fiatRampData?.data?.buyAssetIds ?? [],
)

export const selectFiatSellAssetIds = createDeepEqualOutputSelector(
  fiatRampApi.endpoints.getFiatRamps.select(),
  (fiatRampData): AssetId[] => fiatRampData?.data?.sellAssetIds ?? [],
)

type AssetWithMarketData = Asset & MarketData

export const selectFiatRampBuyAssetsWithMarketData = createSelector(
  selectAssets,
  selectMarketData,
  selectFiatBuyAssetIds,
  (assetsById, cryptoMarketData, assetIds): AssetWithMarketData[] => {
    return assetIds.reduce<AssetWithMarketData[]>((acc, assetId) => {
      const assetData = assetsById[assetId]
      if (!assetData) return acc
      const marketData = cryptoMarketData[assetId] ?? defaultMarketData
      acc.push({ ...assetData, ...marketData })
      return acc
    }, [])
  },
)
export const selectSupportsFiatRampActionByAssetId = createSelector(
  selectFiatBuyAssetIds,
  selectFiatSellAssetIds,
  selectAssetIdParamFromFilter,
  selectFiatRampActionFromFilter,
  (buyAssetIds, sellAssetIds, assetId, fiatRampAction): boolean => {
    if (!assetId) return false
    if (!fiatRampAction) return false
    const targetArray = fiatRampAction === 'buy' ? buyAssetIds : sellAssetIds
    return targetArray.includes(assetId)
  },
)
export const selectSupportsFiatRampByAssetId = createSelector(
  selectFiatBuyAssetIds,
  selectFiatSellAssetIds,
  selectAssetIdParamFromFilter,
  (buyAssetIds, sellAssetIds, assetId): boolean => {
    if (!assetId) return false
    const targetArray = uniq([...buyAssetIds, ...sellAssetIds])
    return targetArray.includes(assetId)
  },
)
