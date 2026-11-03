import { useCurrentEpochMetadataQuery } from './useCurrentEpochMetadataQuery'

import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppSelector } from '@/state/store'

// Gets the month of the published epoch once it has ended, or undefined while it is still running.
export const useClosedEpochMonth = (): string | undefined => {
  const { data: metadata } = useCurrentEpochMetadataQuery()
  const locale = useAppSelector(preferences.selectors.selectSelectedLocale)

  if (!metadata || Date.now() <= metadata.epochEndTimestamp) return

  return new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
    metadata.epochStartTimestamp,
  )
}
