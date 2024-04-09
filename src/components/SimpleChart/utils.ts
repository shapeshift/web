import type { UTCTimestamp } from 'lightweight-charts'
import { TickMarkType } from 'lightweight-charts'
import type { Interval } from 'react-queries/queries/midgard'

export function formatTickMarks(
  time: UTCTimestamp,
  tickMarkType: TickMarkType,
  locale: string,
): string {
  const date = new Date(time.valueOf() * 1000)
  switch (tickMarkType) {
    case TickMarkType.Year:
      return date.toLocaleString(locale, { year: 'numeric' })
    case TickMarkType.Month:
      return date.toLocaleString(locale, { month: 'short', year: 'numeric' })
    case TickMarkType.DayOfMonth:
      return date.toLocaleString(locale, { month: 'short', day: 'numeric' })
    case TickMarkType.Time:
      return date.toLocaleString(locale, { hour: 'numeric', minute: 'numeric' })
    case TickMarkType.TimeWithSeconds:
      return date.toLocaleString(locale, { hour: 'numeric', minute: 'numeric', second: '2-digit' })
    default:
      return date.toLocaleString(locale, { hour: 'numeric', minute: 'numeric', second: '2-digit' })
  }
}

export type ChartInterval = Interval | 'all'
export function formatHistoryDuration(duration: ChartInterval): string {
  switch (duration) {
    case '5min':
      return `Past five minutes`
    case 'hour':
      return `Past hour`
    case 'day':
      return `Past day`
    case 'week':
      return `Past week`
    case 'month':
      return `Past month`
    case 'year':
      return `Past year`
    case 'all':
      return `All time`
    default:
      return ''
  }
}
