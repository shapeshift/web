import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { createSelector } from 'reselect'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { defaultMarketData } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectAssets, selectMarketData } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { fiatRampApi } from './fiatRamps'

export const useIsSupportedFiatBuyAssetId = (assetId: AssetId): boolean =>
  Boolean(
    (useAppSelector(fiatRampApi.endpoints.getFiatRamps.select()).data?.buyAssetIds ?? []).includes(
      assetId,
    ),
  )

export const useIsSupportedFiatSellAssetId = (assetId: AssetId): boolean =>
  Boolean(
    (useAppSelector(fiatRampApi.endpoints.getFiatRamps.select()).data?.sellAssetIds ?? []).includes(
      assetId,
    ),
  )

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
