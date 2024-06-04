import { memo, useEffect } from 'react'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useCountdown } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/hooks/useCountdown'

type CountdownSpinnerArgs = {
  isLoading: boolean
  initialTimeMs: number
}

export const CountdownSpinner = memo(({ isLoading, initialTimeMs }: CountdownSpinnerArgs) => {
  const { timeRemainingMs, reset, start } = useCountdown(initialTimeMs, false)

  // ensure the countdown ui resets when a quote was loaded
  useEffect(() => {
    if (!isLoading) {
      reset()
      start()
    }
  }, [isLoading, reset, start])

  // ensure the countdown ui resets when refocusing on the window
  useEffect(() => {
    const handleFocus = () => {
      reset()
      start()
    }

    window.addEventListener('focus', handleFocus)

    return () => window.removeEventListener('focus', handleFocus)
  }, [reset, start])

  return (
    <CircularProgress
      size='6'
      value={timeRemainingMs}
      max={initialTimeMs}
      isIndeterminate={isLoading}
    />
  )
})
