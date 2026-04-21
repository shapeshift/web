export interface Period {
  key: string
  label: string
  startDate?: string
  endDate?: string
}

const monthShortFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})

const monthKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

const formatMonthLabel = (date: Date): string =>
  `${monthShortFormatter.format(date)} ${date.getUTCFullYear()}`

export const ALL_TIME_KEY = 'all-time'
export const ALL_TIME_PERIOD: Period = { key: ALL_TIME_KEY, label: 'All Time' }

export const currentMonthKey = (): string => {
  const now = new Date()
  return monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)))
}

// Safety cap to bound dropdown length if createdAt is far in the past or malformed.
const MAX_MONTHS = 120

export const generatePeriods = (createdAt: string | undefined): Period[] => {
  const now = new Date()
  const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const createdDate = createdAt ? new Date(createdAt) : firstMonth
  const candidate = Number.isNaN(createdDate.getTime())
    ? firstMonth
    : new Date(Date.UTC(createdDate.getUTCFullYear(), createdDate.getUTCMonth(), 1))
  // Clamp future createdAt to current month so the dropdown isn't reduced to All Time only.
  const oldestMonth = candidate.getTime() > firstMonth.getTime() ? firstMonth : candidate

  const months: Period[] = []
  const cursor = new Date(firstMonth)
  while (cursor.getTime() >= oldestMonth.getTime() && months.length < MAX_MONTHS) {
    const end = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
    months.push({
      key: monthKey(cursor),
      label: formatMonthLabel(cursor),
      startDate: cursor.toISOString(),
      endDate: end.toISOString(),
    })
    cursor.setUTCMonth(cursor.getUTCMonth() - 1)
  }

  return [...months, ALL_TIME_PERIOD]
}
