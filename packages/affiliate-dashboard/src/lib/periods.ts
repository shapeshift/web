export interface Period {
  label: string
  monthLabel: string
  startDate?: string
  endDate?: string
}

export const RECENT_MONTHS_COUNT = 6
const TOTAL_MONTHS_BACK = 24

const monthShortFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})

const formatMonthLabel = (date: Date): string =>
  `${monthShortFormatter.format(date)} ${date.getUTCFullYear()}`

const generatePeriods = (): Period[] => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()

  const result: Period[] = []
  for (let i = 0; i < TOTAL_MONTHS_BACK; i++) {
    const start = new Date(Date.UTC(year, month - i, 1))
    const end = new Date(Date.UTC(year, month - i + 1, 1))
    result.push({
      label: formatMonthLabel(start),
      monthLabel: monthShortFormatter.format(start),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    })
  }
  result.push({ label: 'All Time', monthLabel: 'All Time' })
  return result
}

export const periods: Period[] = generatePeriods()
export const ALL_TIME_INDEX = periods.length - 1
export const recentPeriods = periods.slice(0, RECENT_MONTHS_COUNT)
export const olderPeriods = periods.slice(RECENT_MONTHS_COUNT, ALL_TIME_INDEX)

interface OlderYearGroup {
  year: string
  items: { period: Period; index: number }[]
}

export const olderByYear: OlderYearGroup[] = (() => {
  const groups = new Map<string, { period: Period; index: number }[]>()
  olderPeriods.forEach((period, i) => {
    const year = period.label.split(' ')[1]
    const list = groups.get(year) ?? []
    list.push({ period, index: RECENT_MONTHS_COUNT + i })
    groups.set(year, list)
  })
  return Array.from(groups.entries()).map(([year, items]) => ({ year, items }))
})()
