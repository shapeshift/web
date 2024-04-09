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
      return 'chart.interval.5min'
    case 'hour':
      return 'chart.interval.hour'
    case 'day':
      return 'chart.interval.day'
    case 'week':
      return 'chart.interval.week'
    case 'month':
      return 'chart.interval.month'
    case 'year':
      return 'chart.interval.year'
    case 'all':
      return 'chart.interval.all'
    default:
      return ''
  }
}
