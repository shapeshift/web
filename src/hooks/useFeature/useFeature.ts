import { Flag, FlagValue } from 'constants/FeatureFlagEnum'

export function useFeature(flag: Flag): boolean {
  return flag === FlagValue.On
}
