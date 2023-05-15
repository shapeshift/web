import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { uniq } from 'lodash'
import { createSelector } from 'reselect'
import type { Asset } from 'lib/asset-service'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAssetIdParamFromFilter } from 'state/selectors'
import { defaultMarketData } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectAssets,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
} from 'state/slices/selectors'

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
  selectSelectedCurrencyMarketDataSortedByMarketCap,
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
