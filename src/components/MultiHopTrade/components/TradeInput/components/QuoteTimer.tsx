import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import {
  TRADE_QUOTE_REFRESH_INTERVAL_MS,
  TRADE_QUOTE_TIMER_UPDATE_MS,
  useGlobalPolling,
} from '@/components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeRates'

type QuoteTimerProps = {
  size?: string | number
}

const getElapsed = (lastRefreshTime: number) => {
  const elapsed = Date.now() - lastRefreshTime
  return Math.max(0, TRADE_QUOTE_REFRESH_INTERVAL_MS - elapsed)
}

export const useQueryPollingStatus = () => {
  const query = useGlobalPolling()

  const pollingStatus = useMemo(() => {
    if (!query) return null

    const now = Date.now()
    const timeUntilNextRefetch =
      query.dataUpdatedAt && query.data
        ? Math.max(0, query.dataUpdatedAt + query.data.lastExecutedTime - now)
        : null

    return {
      isFetching: query.fetchStatus === 'fetching',
      isPaused: query.fetchStatus === 'paused',
      dataUpdatedAt: query.dataUpdatedAt,
      errorUpdatedAt: query.errorUpdatedAt,
      refetchInterval: query.data,
      timeUntilNextRefetch,
      lastRefetchTime: query.dataUpdatedAt,
      nextRefetchTime:
        query.dataUpdatedAt && query.data
          ? query.dataUpdatedAt + query.data.lastExecutedTime
          : null,
    }
  }, [query])

  return pollingStatus
}

export const QuoteTimer = ({ size = '6' }: QuoteTimerProps) => {
  const pollingStatus = useQueryPollingStatus()

  const [timeRemaining, setTimeRemaining] = useState(() =>
    getElapsed(pollingStatus?.lastRefetchTime ?? 0),
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getElapsed(pollingStatus?.lastRefetchTime ?? 0))
    }, TRADE_QUOTE_TIMER_UPDATE_MS)

    return () => clearInterval(interval)
  }, [pollingStatus?.lastRefetchTime])

  return (
    <CircularProgress
      size={size}
      value={timeRemaining}
      max={TRADE_QUOTE_REFRESH_INTERVAL_MS}
      isIndeterminate={false}
    />
  )
}
