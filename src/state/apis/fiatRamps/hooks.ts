import type { AssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { useAppDispatch } from 'state/store'

export const useFetchFiatAssetMarketData = (assetIds: AssetId[]): void => {
  const dispatch = useAppDispatch()
  useEffect(() => {
    const timeframe = HistoryTimeframe.DAY

    if (assetIds.length > 0) {
      dispatch(marketApi.endpoints.findPriceHistoryByAssetIds.initiate({ assetIds, timeframe }))
      dispatch(marketApi.endpoints.findByAssetIds.initiate(assetIds))
    }
  }, [assetIds, dispatch])
}
