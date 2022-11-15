import type { AssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

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
