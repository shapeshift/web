import { format as formatTime } from 'date-fns'
import { RawText } from 'components/Text'

import { useCountdown } from '../hooks/useCountdown'

export const TimeRemaining = ({ initialTimeMs }: { initialTimeMs: number }) => {
  const { timeRemainingMs } = useCountdown({ initialTimeMs, autoStart: true })

  return <RawText>{formatTime(timeRemainingMs, 'mm:ss')}</RawText>
}
