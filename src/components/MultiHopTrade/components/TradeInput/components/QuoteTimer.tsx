import { useEffect, useState } from 'react'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { TRADE_QUOTE_REFRESH_INTERVAL_MS } from '@/components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeRates'
import { selectBatchTradeRateQueryLoadingState } from '@/state/apis/swapper/selectors'
import { useAppSelector } from '@/state/store'

const TRADE_QUOTE_TIMER_UPDATE_MS = 100

type QuoteTimerProps = {
  size?: string | number
}

export const QuoteTimer = ({ size = '6' }: QuoteTimerProps) => {
  const batchQueryState = useAppSelector(selectBatchTradeRateQueryLoadingState)
  const [timeRemaining, setTimeRemaining] = useState(0)

  useEffect(() => {
    const updateTimer = () => {
      // Use the timeRemaining from the selector, but update it every 100ms for smooth animation
      if (batchQueryState.lastFulfilledTime) {
        const remaining = Math.max(
          0,
          batchQueryState.lastFulfilledTime + TRADE_QUOTE_REFRESH_INTERVAL_MS - Date.now(),
        )
        setTimeRemaining(remaining)
      } else {
        setTimeRemaining(0)
      }
    }

    // Update immediately
    updateTimer()

    // Create stable interval for smooth animation
    const interval = setInterval(updateTimer, TRADE_QUOTE_TIMER_UPDATE_MS)

    return () => clearInterval(interval)
  }, [batchQueryState.lastFulfilledTime])

  return (
    <CircularProgress
      size={size}
      value={timeRemaining}
      max={TRADE_QUOTE_REFRESH_INTERVAL_MS}
      isIndeterminate={batchQueryState.isLoading || batchQueryState.isFetching}
    />
  )
}
