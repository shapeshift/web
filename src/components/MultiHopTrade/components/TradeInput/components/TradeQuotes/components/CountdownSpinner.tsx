import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useCountdown } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/hooks/useCountdown'
import { GET_TRADE_QUOTE_POLLING_INTERVAL } from 'state/apis/swapper/swapperApi'

export const CountdownSpinner = ({ isLoading }: { isLoading: boolean }) => {
  const { timeRemainingMs } = useCountdown({
    initialTimeMs: GET_TRADE_QUOTE_POLLING_INTERVAL,
    autoStart: true,
  })

  return (
    <CircularProgress
      size='6'
      value={timeRemainingMs}
      max={GET_TRADE_QUOTE_POLLING_INTERVAL}
      isIndeterminate={isLoading}
    />
  )
}
