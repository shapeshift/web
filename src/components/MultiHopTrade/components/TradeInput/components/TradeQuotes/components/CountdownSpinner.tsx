import { memo, useEffect } from 'react'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useCountdown } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/hooks/useCountdown'
import { GET_TRADE_QUOTE_POLLING_INTERVAL } from 'state/apis/swapper/swapperApi'

export const CountdownSpinner = memo(({ isLoading }: { isLoading: boolean }) => {
  const { timeRemainingMs, reset, start } = useCountdown(GET_TRADE_QUOTE_POLLING_INTERVAL, false)

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
      max={GET_TRADE_QUOTE_POLLING_INTERVAL}
      isIndeterminate={isLoading}
    />
  )
})
