import { swapperParameters } from './swapper'
import type { FeeCurveParameters, ParameterModel } from './types'

export const feeCurveParameters: Record<ParameterModel, FeeCurveParameters> = {
  swapper: swapperParameters,
}
