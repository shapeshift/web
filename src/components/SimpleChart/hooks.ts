import type { UTCTimestamp } from 'lightweight-charts'
import { useCallback } from 'react'

import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppSelector } from '@/state/store'

export function useHeaderDateFormatter() {
  const locale = useAppSelector(preferences.selectors.selectSelectedLocale)
  return useCallback(
    (time?: UTCTimestamp) => {
      if (!time) return '-'
      const headerTimeFormatOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }
      return new Date(time * 1000).toLocaleString(locale, headerTimeFormatOptions)
    },
    [locale],
  )
}
