import dayjs from 'dayjs'
import durationPlugin from 'dayjs/plugin/duration'

export const formatSecondsToDuration = (seconds: number) => {
  dayjs.extend(durationPlugin)
  const duration = dayjs.duration(seconds, 'seconds')
  const hours = duration.asHours()
  const days = duration.asDays()
  const months = duration.asMonths()

  if (hours < 24) {
    return `${Math.floor(hours)} hour${Math.floor(hours) !== 1 ? 's' : ''}`
  } else if (days < 31) {
    return `${Math.floor(days)} day${Math.floor(days) !== 1 ? 's' : ''}`
  } else {
    return `${Math.floor(months)} month${Math.floor(months) !== 1 ? 's' : ''}`
  }
}
