import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { RawText } from 'components/Text'

import { useCountdown } from '../hooks/useCountdown'

dayjs.extend(duration)

export const TimeRemaining = ({ initialTimeMs }: { initialTimeMs: number }) => {
  const { timeRemainingMs } = useCountdown(initialTimeMs, true)

  return timeRemainingMs > 0 ? (
    <RawText fontWeight='bold'>{dayjs.duration(timeRemainingMs).format('mm:ss')}</RawText>
  ) : null
}
