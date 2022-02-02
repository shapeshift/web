import { getConfig } from 'config'

export type Flag = typeof FeatureFlagEnum[keyof typeof FeatureFlagEnum]

export const FeatureFlagEnum = {
  Yearn: getConfig().REACT_APP_FEATURE_YEARN,
  CosmosInvestor: getConfig().REACT_APP_FEATURE_COSMOS_INVESTOR
} as const
