import { ChainTypes } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ReduxState } from 'state/reducer'
import { fetchMarketData } from 'state/slices/marketDataSlice/marketDataSlice'

export function useMarketData({ chain, tokenId }: { chain: ChainTypes; tokenId?: string }) {
  const marketData = useSelector(
    (state: ReduxState) => state.marketData.marketData[tokenId ?? chain]
  )
  const dispatch = useDispatch()

  useEffect(() => {
    ;(async () => {
      dispatch(
        fetchMarketData({
          chain,
          tokenId
        })
      )
    })()
  }, [chain, tokenId]) // eslint-disable-line react-hooks/exhaustive-deps

  return marketData
}
