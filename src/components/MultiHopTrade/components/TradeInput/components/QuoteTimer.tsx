import { CircularProgress } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import {
  TRADE_QUOTE_REFRESH_INTERVAL_MS,
  TRADE_QUOTE_TIMER_UPDATE_MS,
} from '@/components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeRates'
import {
  selectIsRefreshPending,
  selectLastRefreshTime,
} from '@/state/slices/tradeQuoteSlice/selectors'
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
  const isRefreshPending = useAppSelector(selectIsRefreshPending)

  const [timeRemaining, setTimeRemaining] = useState(() => getElapsed(lastRefreshTime))

  useEffect(() => {
    const interval = setInterval(() => {
      if (isRefreshPending) {
        // During pending state, set timer to max in anticipation of restart (better animation)
        setTimeRemaining(TRADE_QUOTE_REFRESH_INTERVAL_MS)
      } else {
        setTimeRemaining(getElapsed(lastRefreshTime))
      }
    }, TRADE_QUOTE_TIMER_UPDATE_MS)

    return () => clearInterval(interval)
  }, [lastRefreshTime, isRefreshPending])

  return (
    <CircularProgress
      size={size}
      value={timeRemaining}
      max={TRADE_QUOTE_REFRESH_INTERVAL_MS}
      isIndeterminate={isRefreshPending}
    />
  )
}
