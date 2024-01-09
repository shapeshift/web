import { DEFAULT_SWAPPER_AFFILIATE_BPS } from 'components/MultiHopTrade/constants'

export const FEE_CURVE_MAX_FEE_BPS = Number(DEFAULT_SWAPPER_AFFILIATE_BPS) // basis points
export const FEE_CURVE_MIN_FEE_BPS = 10 // basis points
export const FEE_CURVE_NO_FEE_THRESHOLD_USD = 1_000 // usd
export const FEE_CURVE_FOX_MAX_DISCOUNT_THRESHOLD = 1_000_000 // fox
export const FEE_CURVE_MIDPOINT_USD = 150_000 // usd
export const FEE_CURVE_STEEPNESS_K = 40_000 // unitless
