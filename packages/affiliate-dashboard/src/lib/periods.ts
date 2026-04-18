export interface Period {
  label: string
  startDate?: string
  endDate?: string
}

const PERIOD_DAY = 5
const PREVIOUS_PERIODS_COUNT = 3

const formatPeriodLabel = (start: Date, end: Date): string => {
  const monthShort = new Intl.DateTimeFormat('en-US', { month: 'short' })
  const startLabel = `${monthShort.format(start)} ${start.getUTCDate()}`
  const endLabel = `${monthShort.format(end)} ${end.getUTCDate()}`
  const year = end.getUTCFullYear()
  return `${startLabel} - ${endLabel}, ${year}`
}

const generatePeriods = (): Period[] => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()

  let currentStart: Date
  let currentEnd: Date

  if (now.getUTCDate() < PERIOD_DAY) {
    currentStart = new Date(Date.UTC(year, month - 1, PERIOD_DAY))
    currentEnd = new Date(Date.UTC(year, month, PERIOD_DAY))
  } else {
    currentStart = new Date(Date.UTC(year, month, PERIOD_DAY))
    currentEnd = new Date(Date.UTC(year, month + 1, PERIOD_DAY))
  }

  const result: Period[] = []

  for (let i = 0; i <= PREVIOUS_PERIODS_COUNT; i++) {
    const start = new Date(
      Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth() - i, PERIOD_DAY),
    )
    const end = new Date(
      Date.UTC(currentEnd.getUTCFullYear(), currentEnd.getUTCMonth() - i, PERIOD_DAY),
    )
    result.push({
      label: formatPeriodLabel(start, end),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    })
  }

  result.push({ label: 'All Time' })
  return result
}

export const periods: Period[] = generatePeriods()
