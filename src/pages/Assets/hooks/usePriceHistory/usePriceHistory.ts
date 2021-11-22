import { CAIP19 } from '@shapeshiftoss/caip'
import { HistoryData, HistoryTimeframe } from '@shapeshiftoss/types'
import isEqual from 'lodash/isEqual'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ReduxState } from 'state/reducer'
import { fetchPriceHistory } from 'state/slices/marketDataSlice/marketDataSlice'

type UsePriceHistoryArgs = {
  assets: CAIP19[]
  timeframe: HistoryTimeframe
}

export type PriceHistoryData = {
  [asset: CAIP19]: HistoryData[]
}

export type UsePriceHistoryReturn = {
  loading: boolean
  data: PriceHistoryData
}

export type UsePriceHistory = (args: UsePriceHistoryArgs) => UsePriceHistoryReturn

export const usePriceHistory: UsePriceHistory = ({ assets, timeframe }) => {
  const [data, setData] = useState<PriceHistoryData>({})
  const [loading, setLoading] = useState<boolean>(false)
  const dispatch = useDispatch()
  const priceHistoryForTimeframe = useSelector(
    (state: ReduxState) => state.marketData.priceHistory[timeframe]
  )
  const marketDataLoading = useSelector((state: ReduxState) => state.marketData.loading)

  useEffect(() => {
    if (marketDataLoading) return
    if (!assets.length) return
    if (!assets.every(asset => (priceHistoryForTimeframe[asset] ?? []).length)) return // need price history for all assets
    if (isEqual(priceHistoryForTimeframe, data)) return // don't rerender same data
    setLoading(false)
    setData(priceHistoryForTimeframe)
  }, [assets, data, priceHistoryForTimeframe, marketDataLoading, timeframe])

  useEffect(() => {
    if (loading || marketDataLoading) return // don't fetch if they're loading
    if (!assets.length) return
    if (assets.every(asset => (priceHistoryForTimeframe[asset] ?? []).length)) return // dont fetch if they're all fetched
    setLoading(true)
    dispatch(fetchPriceHistory({ assets, timeframe }))
  }, [assets, dispatch, loading, marketDataLoading, priceHistoryForTimeframe, timeframe])

  return { data, loading }
}
