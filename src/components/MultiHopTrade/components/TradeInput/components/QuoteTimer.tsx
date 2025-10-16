import { useEffect, useState } from 'react'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import {
  TRADE_QUOTE_REFRESH_INTERVAL_MS,
  useGlobalQuotePolling,
} from '@/components/MultiHopTrade/hooks/useGetTradeQuotes/hooks/useGlobalQuotePolling'

const TRADE_QUOTE_TIMER_UPDATE_MS = 100

type QuoteTimerProps = {
  size?: string | number
}

export const QuoteTimer = ({ size = '6' }: QuoteTimerProps) => {
  const query = useGlobalQuotePolling()
  const [timeRemaining, setTimeRemaining] = useState(0)

  useEffect(() => {
    const updateTimer = () => {
      if (query.data?.lastExecutedTime !== undefined) {
        const remaining = Math.max(
          0,
          query.data.lastExecutedTime + TRADE_QUOTE_REFRESH_INTERVAL_MS - Date.now(),
        )
        setTimeRemaining(remaining)
      }
    }

    // Update immediately
    updateTimer()

    // Create stable interval that only recreates when lastExecutedTime changes
    const interval = setInterval(updateTimer, TRADE_QUOTE_TIMER_UPDATE_MS)

    return () => clearInterval(interval)
  }, [query.data?.lastExecutedTime])

  return (
    <CircularProgress
      size={size}
      value={timeRemaining}
      max={TRADE_QUOTE_REFRESH_INTERVAL_MS}
      isIndeterminate={false}
    />
  )
}
