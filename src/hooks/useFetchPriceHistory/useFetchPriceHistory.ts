import { CAIP19 } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect, useMemo } from 'react'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { useAppDispatch } from 'state/store'

type UseFetchPriceHistoryArgs = {
  assetId: CAIP19
  timeframe: HistoryTimeframe
}

type UseFetchPriceHistory = (args: UseFetchPriceHistoryArgs) => void

export const useFetchPriceHistory: UseFetchPriceHistory = ({ assetId, timeframe }) => {
  const dispatch = useAppDispatch()
  // only dispatch once per args
  const args = useMemo(() => ({ assetId, timeframe }), [assetId, timeframe])
  useEffect(() => {
    const result = dispatch(marketApi.endpoints.findPriceHistoryByCaip19.initiate(args))
    // cleanup data in store when it goes out of scope
    return result.unsubscribe
  }, [args, dispatch])
}
