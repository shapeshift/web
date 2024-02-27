export type FeeCurveParameters = {
  FEE_CURVE_MAX_FEE_BPS: number
  FEE_CURVE_MIN_FEE_BPS: number
  FEE_CURVE_NO_FEE_THRESHOLD_USD: number
  FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD: number
  FEE_CURVE_MIDPOINT_USD: number
  FEE_CURVE_STEEPNESS_K: number
}

export type ParameterModel = 'swapper'
// TODO(gomes): Add THORChain LP model parameters and consume them in Thorchain LP domain
// | 'thorchainLP'
