import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { fiatRampApi } from './fiatRamps'

export const useFetchFiatAssetMarketData = (): void => {
  const { data } = useAppSelector(fiatRampApi.endpoints.getFiatRamps.select())
  const dispatch = useAppDispatch()
  useEffect(() => {
    const timeframe = HistoryTimeframe.DAY
    const assetIds = Object.keys(data?.byAssetId ?? {})

    if (assetIds.length > 0) {
      dispatch(marketApi.endpoints.findPriceHistoryByAssetIds.initiate({ assetIds, timeframe }))
    }

    assetIds.forEach(assetId => {
      dispatch(marketApi.endpoints.findByAssetId.initiate(assetId))
    })
  }, [data, dispatch])
}
