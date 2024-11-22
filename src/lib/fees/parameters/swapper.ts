import type { FeeCurveParameters } from './types'

const FEE_CURVE_MAX_FEE_BPS = 69 // basis points
const FEE_CURVE_MIN_FEE_BPS = 20 // basis points
const FEE_CURVE_NO_FEE_THRESHOLD_USD = 1_000 // usd
const FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD = 500_000 // fox
const FEE_CURVE_MIDPOINT_USD = 150_000 // usd
const FEE_CURVE_STEEPNESS_K = 40_000 // unitless
const FEE_CURVE_FOX_DISCOUNT_DELAY_HOURS = 0 // 0 for swapper as per TMDC, see https://forum.shapeshift.com/t/ideation-scp-153-parametric-survival-a-pragmatic-fee-model/975

export const swapperParameters: FeeCurveParameters = {
  FEE_CURVE_MAX_FEE_BPS,
  FEE_CURVE_MIN_FEE_BPS,
  FEE_CURVE_NO_FEE_THRESHOLD_USD,
  FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD,
  FEE_CURVE_MIDPOINT_USD,
  FEE_CURVE_STEEPNESS_K,
  FEE_CURVE_FOX_DISCOUNT_DELAY_HOURS,
}
