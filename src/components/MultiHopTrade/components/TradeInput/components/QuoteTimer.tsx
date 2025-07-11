import { useEffect, useState } from 'react'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import {
  TRADE_QUOTE_REFRESH_INTERVAL_MS,
  TRADE_QUOTE_TIMER_UPDATE_MS,
} from '@/components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeRates'
import { selectLastRefreshTime } from '@/state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from '@/state/store'

type QuoteTimerProps = {
  size?: string | number
}

const getElapsed = (lastRefreshTime: number) => {
  const elapsed = Date.now() - lastRefreshTime
  return Math.max(0, TRADE_QUOTE_REFRESH_INTERVAL_MS - elapsed)
}

export const QuoteTimer = ({ size = '6' }: QuoteTimerProps) => {
  const lastRefreshTime = useAppSelector(selectLastRefreshTime)

  const [timeRemaining, setTimeRemaining] = useState(() => getElapsed(lastRefreshTime))

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getElapsed(lastRefreshTime))
    }, TRADE_QUOTE_TIMER_UPDATE_MS)

    return () => clearInterval(interval)
  }, [lastRefreshTime])

  return (
    <CircularProgress
      size={size}
      value={timeRemaining}
      max={TRADE_QUOTE_REFRESH_INTERVAL_MS}
      isIndeterminate={false}
    />
  )
}
