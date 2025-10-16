import { useEffect, useState } from 'react'

import {
  FIAT_RAMP_QUOTE_REFRESH_INTERVAL_MS,
  useFiatRampQuotePolling,
} from '../hooks/useFiatRampQuotePolling'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import type { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'

const FIAT_RAMP_QUOTE_TIMER_UPDATE_MS = 100

type FiatRampQuoteTimerProps = {
  size?: string | number
  direction: FiatRampAction
}

export const FiatRampQuoteTimer = ({ size = '6', direction }: FiatRampQuoteTimerProps) => {
  const query = useFiatRampQuotePolling(direction)
  const [timeRemaining, setTimeRemaining] = useState(0)

  useEffect(() => {
    const updateTimer = () => {
      if (query.data?.lastExecutedTime !== undefined) {
        const remaining = Math.max(
          0,
          query.data.lastExecutedTime + FIAT_RAMP_QUOTE_REFRESH_INTERVAL_MS - Date.now(),
        )
        setTimeRemaining(remaining)
      }
    }

    updateTimer()

    const interval = setInterval(updateTimer, FIAT_RAMP_QUOTE_TIMER_UPDATE_MS)

    return () => clearInterval(interval)
  }, [query.data?.lastExecutedTime])

  return (
    <CircularProgress
      size={size}
      value={timeRemaining}
      max={FIAT_RAMP_QUOTE_REFRESH_INTERVAL_MS}
      isIndeterminate={false}
    />
  )
}
