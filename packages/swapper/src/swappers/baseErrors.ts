export enum SWAPPER_ERRORS {
  SLIPPAGE_TOLERANCE_EXCEEDED = 'trade.errors.slippageExceeded',
  UNDER_MINIMUM_AMOUNT = 'trade.errors.underMinimumAmount',
  CONSUMED_MORE_FEES = 'trade.errors.consumedMoreFees',
}

export type SwapperErrorMapping = {
  key: SWAPPER_ERRORS
  value: string
}
