import { JUPITER_ERROR_NAMES } from '@shapeshiftoss/swapper'

export const jupiterErrorNamesToTranslationKeys: Record<string, string> = {
  [JUPITER_ERROR_NAMES.SLIPPAGE_TOLERANCE_EXCEEDED]: 'trade.errors.slippageExceeded',
  [JUPITER_ERROR_NAMES.UNDER_MINIMUM_AMOUNT]: 'trade.errors.underMinimumAmount',
  [JUPITER_ERROR_NAMES.CONSUMED_MORE_FEES]: 'trade.errors.consumedMoreFees',
}
