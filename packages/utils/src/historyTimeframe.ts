import { HistoryTimeframe } from '@shapeshiftoss/types'
import dayjs from 'dayjs'

import { assertUnreachable } from './assertUnreachable'

export const getHistoryTimeframeBounds = (
  timeframe: HistoryTimeframe,
  end = dayjs().endOf('day'),
) => {
  let start = end // Shut up typescript.
  switch (timeframe) {
    case HistoryTimeframe.HOUR:
      start = end.subtract(1, 'day')
      break
    case HistoryTimeframe.DAY:
      start = end.subtract(1, 'day')
      break
    case HistoryTimeframe.WEEK:
      start = end.subtract(1, 'week')
      break
    case HistoryTimeframe.MONTH:
      start = end.subtract(1, 'month')
      break
    case HistoryTimeframe.YEAR:
      start = end.subtract(1, 'year')
      break
    case HistoryTimeframe.ALL:
      start = end.subtract(5, 'years')
      break
    default:
      assertUnreachable(timeframe)
  }

  return { start, end }
}
