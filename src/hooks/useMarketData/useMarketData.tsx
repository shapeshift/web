import { CAIP19 } from '@shapeshiftoss/caip'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ReduxState } from 'state/reducer'
import { fetchMarketData, selectMarketDataById } from 'state/slices/marketDataSlice/marketDataSlice'

export function useMarketData(CAIP19: CAIP19) {
  const marketData = useSelector((state: ReduxState) => selectMarketDataById(state, CAIP19))
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(fetchMarketData(CAIP19))
  }, [CAIP19, dispatch])

  return marketData
}
