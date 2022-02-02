import { getConfig } from 'config'

export enum FlagValue {
  On = 'on',
  Off = 'off'
}

export type Flag = typeof FeatureFlagEnum[keyof typeof FeatureFlagEnum]

export const FeatureFlagEnum = {
  Test: FlagValue.On,
  Yearn: FlagValue.On,
  Osmosis: FlagValue.Off,
  CosmosInvestor: getConfig().REACT_APP_FEATURE_COSMOS_INVESTOR
} as const
