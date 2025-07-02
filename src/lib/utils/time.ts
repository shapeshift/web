import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'

import { LanguageTypeEnum } from '@/constants/LanguageTypeEnum'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { store } from '@/state/store'

dayjs.extend(duration)
dayjs.extend(relativeTime)

export const formatSecondsToDuration = (seconds: number) => {
  const selectedLocale = preferences.selectors.selectSelectedLocale(store.getState())
  const locale = selectedLocale in LanguageTypeEnum ? selectedLocale : 'en'
  void import(`dayjs/locale/${locale}.js`)

  return dayjs.duration(seconds, 'seconds').locale(locale).humanize()
}

/**
 * Formats a date with smart relative/absolute formatting:
 * - Recent dates (within 7 days): relative format like "2 hours ago"
 * - Older dates: absolute format like "12/15/2023, 3:45:23 PM"
 */
export const formatSmartDate = (date: string | number | Date): string => {
  const targetDate = dayjs(date)
  const isWithinLastWeek = targetDate.isAfter(dayjs().subtract(7, 'day'))

  if (isWithinLastWeek) {
    return targetDate.fromNow() // "2 hours ago"
  }

  return targetDate.toDate().toLocaleString() // "12/15/2023, 3:45:23 PM"
}
