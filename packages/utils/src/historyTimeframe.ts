import { HistoryTimeframe } from '@shapeshiftoss/types'
import dayjs from 'dayjs'

export const getHistoryTimeframeBounds = (timeframe: HistoryTimeframe) => {
  const end = dayjs().endOf('day')
  let start
  switch (timeframe) {
    case HistoryTimeframe.HOUR:
      // minimum granularity on upstream API is 1 day
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
      start = end
  }

  return { start, end }
}
