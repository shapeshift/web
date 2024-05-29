import dayjs from 'dayjs'
import durationPlugin from 'dayjs/plugin/duration'

export const formatSecondsToDuration = (seconds: number) => {
  dayjs.extend(durationPlugin)
  const duration = dayjs.duration(seconds, 'seconds')
  const hours = duration.asHours()
  const days = duration.asDays()
  const months = duration.asMonths()
  const minutes = duration.asMinutes()

  if (seconds < 60) {
    return `${Math.floor(seconds)} second${Math.floor(seconds) !== 1 ? 's' : ''}`
  }

  if (minutes < 60) {
    return `${Math.floor(minutes)} minute${Math.floor(minutes) !== 1 ? 's' : ''}`
  }
  if (hours < 24) {
    return `${Math.floor(hours)} hour${Math.floor(hours) !== 1 ? 's' : ''}`
  }
  if (days < 30) {
    return `${Math.floor(days)} day${Math.floor(days) !== 1 ? 's' : ''}`
  }
  return `${Math.floor(months)} month${Math.floor(months) !== 1 ? 's' : ''}`
}
