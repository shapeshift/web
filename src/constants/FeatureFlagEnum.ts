export enum FlagValue {
  On = 'on',
  Off = 'off'
}

export type Flag = typeof FeatureFlagEnum[keyof typeof FeatureFlagEnum]

export const FeatureFlagEnum = {
  Test: FlagValue.On,
  Yearn: FlagValue.On,
  Osmosis: FlagValue.Off
} as const
