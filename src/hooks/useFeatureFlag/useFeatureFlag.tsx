import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlag } from 'state/slices/preferencesSlice/selectors'
import { useAppSelector } from 'state/store'

export const useFeatureFlag = (flag: keyof FeatureFlags) => {
  return useAppSelector(state => selectFeatureFlag(state, flag))
}
