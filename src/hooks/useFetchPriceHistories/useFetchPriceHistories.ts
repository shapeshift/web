import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectSelectedCurrency } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

const { findPriceHistoryByAssetIds, findPriceHistoryByFiatSymbol } = marketApi.endpoints

export const useFetchPriceHistories = (assetIds: AssetId[], timeframe: HistoryTimeframe) => {
  const dispatch = useAppDispatch()
  const symbol = useAppSelector(selectSelectedCurrency)

  useEffect(() => {
    dispatch(findPriceHistoryByAssetIds.initiate({ assetIds, timeframe }))
  }, [assetIds, dispatch, timeframe])

  useEffect(() => {
    // we already know 1usd costs 1usd
    if (symbol === 'USD') return
    dispatch(findPriceHistoryByFiatSymbol.initiate({ symbol, timeframe }))
  }, [dispatch, symbol, timeframe])
}
