import type { SwapperErrorMapping } from '../baseErrors'
import { SWAPPER_ERRORS } from '../baseErrors'

export class SolanaLogsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SolanaLogsError'
  }
}

export const JUPITER_ERROR_VALUES = {
  SLIPPAGE_TOLERANCE_EXCEEDED: 'SlippageToleranceExceeded',
  UNDER_MINIMUM_AMOUNT: 'RequireGteViolated',
  CONSUMED_MORE_FEES: 'exceeded CUs meter',
} as const

export const JUPITER_ERRORS: SwapperErrorMapping[] = [
  {
    key: SWAPPER_ERRORS.SLIPPAGE_TOLERANCE_EXCEEDED,
    value: JUPITER_ERROR_VALUES.SLIPPAGE_TOLERANCE_EXCEEDED,
  },
  {
    key: SWAPPER_ERRORS.UNDER_MINIMUM_AMOUNT,
    value: JUPITER_ERROR_VALUES.UNDER_MINIMUM_AMOUNT,
  },
  {
    key: SWAPPER_ERRORS.CONSUMED_MORE_FEES,
    value: JUPITER_ERROR_VALUES.CONSUMED_MORE_FEES,
  },
]
