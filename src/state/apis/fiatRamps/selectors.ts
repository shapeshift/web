import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { createSelector } from 'reselect'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { defaultMarketData, marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectAssets, selectMarketData } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useAppDispatch } from '../../store'
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

export const useFetchFiatAssetMarketData = (): void => {
  const { data } = useAppSelector(fiatRampApi.endpoints.getFiatRamps.select())
  const dispatch = useAppDispatch()
  useEffect(() => {
    const timeframe = HistoryTimeframe.DAY
    const assetIds = Object.keys(data?.byAssetId ?? {})
    assetIds.forEach(assetId => {
      dispatch(marketApi.endpoints.findByAssetId.initiate(assetId))
      dispatch(marketApi.endpoints.findPriceHistoryByAssetId.initiate({ assetId, timeframe }))
    })
  }, [data, dispatch])
}

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
