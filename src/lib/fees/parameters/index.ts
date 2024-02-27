import { swapperParameters } from './swapper'
import { thorchainLpParameters } from './thorchainLp'
import type { FeeCurveParameters, ParameterModel } from './types'

export const feeCurveParameters: Record<ParameterModel, FeeCurveParameters> = {
  swapper: swapperParameters,
  thorchainLp: thorchainLpParameters,
}
