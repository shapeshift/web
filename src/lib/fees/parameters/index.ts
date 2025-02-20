import { swapperParameters } from './swapper'
import { thorchainLpParameters } from './thorchainLp'
import type { FeeCurveParameters, ParameterModel } from './types'

export const FEE_CURVE_PARAMETERS: Record<ParameterModel, FeeCurveParameters> = {
  SWAPPER: swapperParameters,
  THORCHAIN_LP: thorchainLpParameters,
}

export const FEE_MODEL_TO_FEATURE_NAME: Record<ParameterModel, string> = {
  SWAPPER: 'common.trade',
  THORCHAIN_LP: 'common.lpDeposit',
}

export const FEE_MODEL_TO_FEATURE_NAME_PLURAL: Record<ParameterModel, string> = {
  SWAPPER: 'common.trades',
  THORCHAIN_LP: 'common.lpDeposits',
}
