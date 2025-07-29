import { usePrevious } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { TRADE_QUOTE_REFRESH_INTERVAL_MS } from '@/components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeRates'
import { useHasFocus } from '@/hooks/useHasFocus'
import { selectBatchTradeRateQueryLoadingState } from '@/state/apis/swapper/selectors'
import { selectQuoteTimerResetTimestamp } from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type QuoteTimerProps = {
  size?: string | number
}

const TIMER_INTERVAL_MS = 100 // Update more frequently for smooth animation

const getTimeRemaining = (timerResetTimestamp: number | undefined) => {
  if (timerResetTimestamp === undefined) return TRADE_QUOTE_REFRESH_INTERVAL_MS
  const elapsed = Date.now() - timerResetTimestamp
  return TRADE_QUOTE_REFRESH_INTERVAL_MS - elapsed
}

export const QuoteTimer = ({ size = '6' }: QuoteTimerProps) => {
  const dispatch = useAppDispatch()
  const batchQueryState = useAppSelector(selectBatchTradeRateQueryLoadingState)
  const timerResetTimestamp = useAppSelector(selectQuoteTimerResetTimestamp)
  const previousIsFetching = usePrevious(batchQueryState.isFetching)
  const hasFocus = useHasFocus()
  const previousHasFocus = usePrevious(hasFocus)

  const [msRemaining, setMsRemaining] = useState(() => getTimeRemaining(timerResetTimestamp))
  const intervalRef = useRef<NodeJS.Timeout>(undefined)

  // Reset timer when fetch finishes
  useEffect(() => {
    const justFinishedFetching = previousIsFetching && !batchQueryState.isFetching
    if (justFinishedFetching) {
      dispatch(tradeQuoteSlice.actions.resetQuoteTimer())
    }
  }, [batchQueryState.isFetching, previousIsFetching, dispatch])

  // Reset timer on focus gain
  useEffect(() => {
    const justGainedFocus = previousHasFocus === false && hasFocus
    if (justGainedFocus) {
      dispatch(tradeQuoteSlice.actions.resetQuoteTimer())
    }
  }, [hasFocus, previousHasFocus, dispatch])

  // Update countdown based on Redux timestamp
  useEffect(() => {
    // Set up interval for smooth animation
    intervalRef.current = setInterval(() => {
      setMsRemaining(getTimeRemaining(timerResetTimestamp))
    }, TIMER_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timerResetTimestamp])

  return (
    <CircularProgress
      size={size}
      value={msRemaining}
      max={TRADE_QUOTE_REFRESH_INTERVAL_MS}
      isIndeterminate={batchQueryState.isLoading || batchQueryState.isFetching}
    />
  )
}
