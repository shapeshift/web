import { swapperParameters } from './swapper'
import { thorchainLendingParameters } from './thorchainLending'
import { thorchainLpParameters } from './thorchainLp'
import type { FeeCurveParameters, ParameterModel } from './types'

export const FEE_CURVE_PARAMETERS: Record<ParameterModel, FeeCurveParameters> = {
  SWAPPER: swapperParameters,
  THORCHAIN_LP: thorchainLpParameters,
  LENDING: thorchainLendingParameters,
}

export const FEE_MODEL_TO_FEATURE_NAME: Record<ParameterModel, string> = {
  SWAPPER: 'common.trade',
  THORCHAIN_LP: 'common.lpDeposit',
  LENDING: 'common.loan',
}

export const FEE_MODEL_TO_FEATURE_NAME_PLURAL: Record<ParameterModel, string> = {
  SWAPPER: 'common.trades',
  THORCHAIN_LP: 'common.lpDeposits',
  LENDING: 'common.loans',
}
