import { format as formatTime } from 'date-fns'
import { RawText } from 'components/Text'

import { useCountdown } from '../hooks/useCountdown'

export const TimeRemaining = ({ initialTimeMs }: { initialTimeMs: number }) => {
  const { timeRemainingMs } = useCountdown(initialTimeMs, true)

  return timeRemainingMs > 0 ? (
    <RawText fontWeight='bold'>{formatTime(timeRemainingMs, 'mm:ss')}</RawText>
  ) : null
}
