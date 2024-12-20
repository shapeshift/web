export enum SWAPPER_ERRORS {
  SLIPPAGE_EXCEEDED = 'trade.errors.slippageExceeded',
  UNDER_MINIMUM_AMOUNT = 'trade.errors.underMinimumAmount',
}

export type SwapperErrorMapping = {
  key: SWAPPER_ERRORS
  value: string
}
