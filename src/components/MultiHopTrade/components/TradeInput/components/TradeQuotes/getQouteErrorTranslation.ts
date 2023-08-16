import type { InterpolationOptions } from 'node-polyglot'
import type { SwapErrorRight } from 'lib/swapper/api'
import { SwapErrorType } from 'lib/swapper/api'

export const quoteStatusTranslation = (
  swapError: SwapErrorRight | undefined,
): string | [string, InterpolationOptions] => {
  const code = swapError?.code

  switch (code) {
    case SwapErrorType.TRADING_HALTED:
      return 'trade.errors.tradingNotActiveNoAssetSymbol'
    case SwapErrorType.TRADE_BELOW_MINIMUM:
    case SwapErrorType.TRADE_QUOTE_AMOUNT_TOO_SMALL:
      return 'trade.errors.amountTooSmallUnknownMinimum'
    case SwapErrorType.UNSUPPORTED_PAIR:
      return 'trade.errors.unsupportedTradePair'
    default:
      return 'trade.errors.quoteError'
  }
}
