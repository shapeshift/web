import type { FeeCurveParameters } from './types'

// THOR asset doesn't have any fee models for now as it's not using curves, we only zero out values to make TS happy with less risks
const FEE_CURVE_MAX_FEE_BPS = 0
const FEE_CURVE_MIN_FEE_BPS = 0
const FEE_CURVE_NO_FEE_THRESHOLD_USD = 0
const FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD = 0
const FEE_CURVE_MIDPOINT_USD = 0
const FEE_CURVE_STEEPNESS_K = 0
const FEE_CURVE_FOX_DISCOUNT_DELAY_HOURS = 0

export const thorParameters: FeeCurveParameters = {
  FEE_CURVE_MAX_FEE_BPS,
  FEE_CURVE_MIN_FEE_BPS,
  FEE_CURVE_NO_FEE_THRESHOLD_USD,
  FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD,
  FEE_CURVE_MIDPOINT_USD,
  FEE_CURVE_STEEPNESS_K,
  FEE_CURVE_FOX_DISCOUNT_DELAY_HOURS,
}
