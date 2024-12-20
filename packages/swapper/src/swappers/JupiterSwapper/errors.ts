import type { SwapperErrorMapping } from '../baseErrors'
import { SWAPPER_ERRORS } from '../baseErrors'

export const JUPITER_ERROR_VALUES = {
  SLIPPAGE_EXCEEDED: 'SlippageToleranceExceeded',
  UNDER_MINIMUM_AMOUNT: 'RequireGteViolated',
} as const

export const JUPITER_ERRORS: SwapperErrorMapping[] = [
  {
    key: SWAPPER_ERRORS.SLIPPAGE_EXCEEDED,
    value: JUPITER_ERROR_VALUES.SLIPPAGE_EXCEEDED,
  },
  {
    key: SWAPPER_ERRORS.UNDER_MINIMUM_AMOUNT,
    value: JUPITER_ERROR_VALUES.UNDER_MINIMUM_AMOUNT,
  },
]
