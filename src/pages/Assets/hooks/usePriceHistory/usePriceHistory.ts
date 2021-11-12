import { CAIP19 } from '@shapeshiftoss/caip'
import { HistoryData, HistoryTimeframe } from '@shapeshiftoss/types'
import keys from 'lodash/keys'
import size from 'lodash/size'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ReduxState } from 'state/reducer'
import { fetchPriceHistory } from 'state/slices/marketDataSlice/marketDataSlice'

type UsePriceHistory = {
  assets: CAIP19[]
  timeframe: HistoryTimeframe
}

export const usePriceHistory = ({ assets, timeframe }: UsePriceHistory) => {
  const [data, setData] = useState<{ [asset: CAIP19]: HistoryData[] }>({})
  const [loading, setLoading] = useState<boolean>(false)
  const dispatch = useDispatch()
  const priceHistoryForTimeframe = useSelector(
    (state: ReduxState) => state.marketData.priceHistory[timeframe]
  )
  const marketDataLoading = useSelector((state: ReduxState) => state.marketData.loading)

  useEffect(() => {
    setLoading(false)
    setData(priceHistoryForTimeframe)
  }, [priceHistoryForTimeframe, timeframe])

  useEffect(() => {
    if (loading || marketDataLoading) return // don't fetch if they're loading
    if (!assets.every(Boolean)) return // don't fetch if they're empty strings
    const assetCount = size(assets)
    const loadedPriceCount = size(keys(priceHistoryForTimeframe))
    if (assetCount === loadedPriceCount) return // dont fetch if they're all fetched
    setLoading(true)
    console.info('dispatching')
    dispatch(fetchPriceHistory({ assets, timeframe }))
  }, [assets, dispatch, loading, marketDataLoading, priceHistoryForTimeframe, timeframe])

  return { data, loading }
}
