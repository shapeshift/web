import { swapperParameters } from './swapper'
import { thorParameters } from './thor'
import { thorchainLpParameters } from './thorchainLp'
import type { FeeCurveParameters, ParameterModel } from './types'

export const FEE_CURVE_PARAMETERS: Record<ParameterModel, FeeCurveParameters> = {
  SWAPPER: swapperParameters,
  THORCHAIN_LP: thorchainLpParameters,
  THORSWAP: thorParameters,
}

export const FEE_MODEL_TO_FEATURE_NAME: Record<ParameterModel, string> = {
  SWAPPER: 'common.trade',
  THORCHAIN_LP: 'common.lpDeposit',
  THORSWAP: 'common.trade',
}

export const FEE_MODEL_TO_FEATURE_NAME_PLURAL: Record<ParameterModel, string> = {
  SWAPPER: 'common.trades',
  THORCHAIN_LP: 'common.lpDeposits',
  THORSWAP: 'common.trade',
}
