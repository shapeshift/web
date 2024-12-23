export class SolanaLogsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SolanaLogsError'
  }
}

export enum JUPITER_ERROR_PATTERNS {
  SLIPPAGE_TOLERANCE_EXCEEDED = 'SlippageToleranceExceeded',
  UNDER_MINIMUM_AMOUNT = 'RequireGteViolated',
  CONSUMED_MORE_FEES = 'exceeded CUs meter',
}

export const JUPITER_ERRORS: Record<JUPITER_ERROR_PATTERNS | string, string> = {
  [JUPITER_ERROR_PATTERNS.SLIPPAGE_TOLERANCE_EXCEEDED]: 'trade.errors.slippageExceeded',
  [JUPITER_ERROR_PATTERNS.UNDER_MINIMUM_AMOUNT]: 'trade.errors.underMinimumAmount',
  [JUPITER_ERROR_PATTERNS.CONSUMED_MORE_FEES]: 'trade.errors.consumedMoreFees',
}
