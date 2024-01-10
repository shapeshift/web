import type { InterpolationOptions } from 'node-polyglot'
import { assertUnreachable } from 'lib/utils'
import type { ErrorWithMeta } from 'state/apis/swappers'
import { TradeQuoteError } from 'state/apis/swappers'

export const quoteStatusTranslation = (
  tradeQuoteError: ErrorWithMeta<TradeQuoteError>,
): [string, InterpolationOptions | undefined] => {
  const error = tradeQuoteError.error
  const translationKey = (() => {
    switch (error) {
      case TradeQuoteError.NoQuotesAvailableForTradePair:
        return 'trade.errors.unsupportedTradePair'
      case TradeQuoteError.SmartContractWalletNotSupported:
        return 'trade.errors.smartContractWalletNotSupported'
      case TradeQuoteError.TradingHalted:
        return 'trade.errors.tradingNotActiveNoAssetSymbol'
      case TradeQuoteError.TradingInactiveOnSellChain:
        return 'trade.errors.tradingNotActiveForChain'
      case TradeQuoteError.TradingInactiveOnBuyChain:
        return 'trade.errors.tradingNotActiveForChain'
      case TradeQuoteError.SellAmountBelowTradeFee:
        return 'trade.errors.sellAmountDoesNotCoverFee'
      case TradeQuoteError.InsufficientFirstHopFeeAssetBalance:
        return 'common.insufficientAmountForGas'
      case TradeQuoteError.InsufficientSecondHopFeeAssetBalance:
        return 'common.insufficientAmountForGas'
      case TradeQuoteError.InsufficientFundsForProtocolFee:
        return 'trade.errors.insufficientFundsForProtocolFee'
      case TradeQuoteError.IntermediaryAssetNotNotSupportedByWallet:
        return 'trade.errors.assetNotSupportedByWallet'
      case TradeQuoteError.SellAmountBelowMinimum:
        return 'trade.errors.amountTooSmall'
      case TradeQuoteError.InputAmountTooSmallUnknownMinimum:
        return 'trade.errors.amountTooSmallUnknownMinimum'
      case TradeQuoteError.InputAmountLowerThanFees:
      case TradeQuoteError.UnsafeQuote:
        console.error('TradeQuoteError.UnsafeQuote should be a warning')
        return 'trade.errors.quoteError'
      case TradeQuoteError.UnknownError:
        return 'trade.errors.quoteError'
      default:
        assertUnreachable(error)
    }
  })()

  return [translationKey, tradeQuoteError.meta]
}
