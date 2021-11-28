import { CAIP19 } from '@shapeshiftoss/caip'
import { HistoryData, HistoryTimeframe } from '@shapeshiftoss/types'
import entries from 'lodash/entries'
import isEmpty from 'lodash/isEmpty'
import reduce from 'lodash/reduce'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ReduxState } from 'state/reducer'
import { fetchPriceHistory } from 'state/slices/marketDataSlice/marketDataSlice'

type UsePriceHistoryArgs = {
  assets: CAIP19[]
  timeframe: HistoryTimeframe
}

export type PriceHistoryData = {
  [asset: CAIP19]: {
    loading: boolean
    data: HistoryData[]
  }
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
  useEffect(() => {
    if (!assets.length) return
    if (isEmpty(priceHistoryForTimeframe)) return

    const hasDataChanged = reduce(
      entries(priceHistoryForTimeframe),
      (acc, [assetCAIP19, assetPriceHistory], _idx, col) => {
        // we have a different number of asset price histories, it must be new
        if (assets.length !== col.length) return true
        // the first price history date is different, it must be new
        // note this handles the future case of refetching fresh price history
        if (data?.[assetCAIP19]?.data?.[0]?.date !== assetPriceHistory?.data?.[0]?.date) return true
        return acc
      },
      false
    )

    if (hasDataChanged) {
      // console.log('hook setting price history')
      setData(priceHistoryForTimeframe)
    }

    const newLoading = Object.values(priceHistoryForTimeframe).some(({ loading }) => loading)
    if (!newLoading && loading) setLoading(false)
  }, [assets, loading, data, priceHistoryForTimeframe])

  useEffect(() => {
    if (!assets.length) return
    assets.forEach(asset => {
      const assetPriceHistoryForTimeframe = priceHistoryForTimeframe[asset]
      const loading = assetPriceHistoryForTimeframe?.loading
      const data = assetPriceHistoryForTimeframe?.data
      if (loading || data?.length) return
      // console.log('hook fetching price history')
      setLoading(true)
      setTimeout(() => dispatch(fetchPriceHistory({ asset, timeframe })), 0)
    })
  }, [assets, dispatch, priceHistoryForTimeframe, timeframe])

  return { data, loading }
}
