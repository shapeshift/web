import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset, MarketData } from '@shapeshiftoss/types'
import { uniq } from 'lodash'
import { createSelector } from 'reselect'
import { createDeepEqualOutputSelector, selectAssetIdParamFromFilter } from 'state/selectors/utils'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { defaultMarketData } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectMarketDataUserCurrency } from 'state/slices/marketDataSlice/selectors'

import { fiatRampApi } from './fiatRamps'

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
