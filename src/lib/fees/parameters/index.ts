import { swapperParameters } from './swapper'
import { thorchainLpParameters } from './thorchainLp'
import type { FeeCurveParameters, ParameterModel } from './types'

export const FEE_CURVE_PARAMETERS: Record<ParameterModel, FeeCurveParameters> = {
  SWAPPER: swapperParameters,
  THORCHAIN_LP: thorchainLpParameters,
}
