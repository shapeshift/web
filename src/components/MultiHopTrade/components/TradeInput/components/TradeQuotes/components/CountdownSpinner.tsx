import { memo, useEffect } from 'react'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { useCountdown } from '@/components/MultiHopTrade/components/TradeConfirm/hooks/useCountdown'

type CountdownSpinnerArgs = {
  isLoading: boolean
  initialTimeMs: number
  onComplete?: () => void
}

export const CountdownSpinner = memo(
  ({ isLoading, initialTimeMs, onComplete }: CountdownSpinnerArgs) => {
    const { timeRemainingMs, reset, start } = useCountdown(initialTimeMs, onComplete)

    // ensure the countdown ui resets when a quote was loaded
    useEffect(() => {
      if (!isLoading) {
        reset()
        start()
      }
    }, [isLoading, reset, start])

    // ensure the countdown ui resets when refocusing on the window
    useEffect(() => {
      window.addEventListener('focus', start)
      window.addEventListener('blur', reset)

      return () => {
        window.removeEventListener('focus', start)
        window.removeEventListener('blur', reset)
      }
    }, [reset, start])

    return (
      <CircularProgress
        size='6'
        value={timeRemainingMs}
        max={initialTimeMs}
        isIndeterminate={isLoading}
      />
    )
  },
)
