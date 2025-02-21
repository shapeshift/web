import type { AssetId } from '@shapeshiftmonorepo/caip'
import { fromAssetId } from '@shapeshiftmonorepo/caip'
import type { Asset, MarketData } from '@shapeshiftmonorepo/types'
import { uniq } from 'lodash'
import { createSelector } from 'reselect'

import { fiatRampApi } from './fiatRamps'

import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import { selectAssetIdParamFromFilter } from '@/state/selectors'
import { defaultMarketData } from '@/state/slices/marketDataSlice/marketDataSlice'
import { selectAssets, selectMarketDataUserCurrency } from '@/state/slices/selectors'

export const selectFiatBuyAssetIds = createDeepEqualOutputSelector(
  fiatRampApi.endpoints.getFiatRamps.select(),
  (fiatRampData): AssetId[] => fiatRampData?.data?.buyAssetIds ?? [],
)

export const selectFiatRampChainCount = createSelector(
  fiatRampApi.endpoints.getFiatRamps.select(),
  (fiatRampData): number =>
    new Set(
      Object.keys(fiatRampData.data?.byAssetId ?? {}).map(assetId => fromAssetId(assetId).chainId),
    ).size,
)

export const selectFiatSellAssetIds = createDeepEqualOutputSelector(
  fiatRampApi.endpoints.getFiatRamps.select(),
  (fiatRampData): AssetId[] => fiatRampData?.data?.sellAssetIds ?? [],
)

type AssetWithMarketData = Asset & MarketData

export const selectFiatRampBuyAssetsWithMarketData = createSelector(
  selectAssets,
  selectMarketDataUserCurrency,
  selectFiatBuyAssetIds,
  (assetsById, marketData, assetIds): AssetWithMarketData[] => {
    return assetIds.reduce<AssetWithMarketData[]>((acc, assetId) => {
      const assetData = assetsById[assetId]
      if (!assetData) return acc
      const marketDataForAsset = marketData[assetId] ?? defaultMarketData
      acc.push({ ...assetData, ...marketDataForAsset })
      return acc
    }, [])
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
