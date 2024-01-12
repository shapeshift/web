import { TradeQuoteError as SwapperTradeQuoteError } from '@shapeshiftoss/swapper'
import type { InterpolationOptions } from 'node-polyglot'
import { assertUnreachable } from 'lib/utils'
import type { ErrorWithMeta } from 'state/apis/swappers'
import { type TradeQuoteError, TradeQuoteValidationError } from 'state/apis/swappers'

export const getQuoteErrorTranslation = (
  tradeQuoteError: ErrorWithMeta<TradeQuoteError>,
): string | [string, InterpolationOptions] => {
  const error = tradeQuoteError.error
  const translationKey = (() => {
    switch (error) {
      case SwapperTradeQuoteError.NoQuotesAvailableForTradePair:
        return 'trade.errors.unsupportedTradePair'
      case TradeQuoteValidationError.SmartContractWalletNotSupported:
        return 'trade.errors.smartContractWalletNotSupported'
      case SwapperTradeQuoteError.TradingHalted:
        return 'trade.errors.tradingNotActiveNoAssetSymbol'
      case TradeQuoteValidationError.TradingInactiveOnSellChain:
        return 'trade.errors.tradingNotActiveForChain'
      case TradeQuoteValidationError.TradingInactiveOnBuyChain:
        return 'trade.errors.tradingNotActiveForChain'
      case TradeQuoteValidationError.SellAmountBelowTradeFee:
      case SwapperTradeQuoteError.SellAmountBelowTradeFee:
        return 'trade.errors.sellAmountDoesNotCoverFee'
      case TradeQuoteValidationError.InsufficientFirstHopFeeAssetBalance:
        return 'common.insufficientAmountForGas'
      case TradeQuoteValidationError.InsufficientSecondHopFeeAssetBalance:
        return 'common.insufficientAmountForGas'
      case TradeQuoteValidationError.InsufficientFundsForProtocolFee:
        return 'trade.errors.insufficientFundsForProtocolFee'
      case TradeQuoteValidationError.IntermediaryAssetNotNotSupportedByWallet:
        return 'trade.errors.assetNotSupportedByWallet'
      case SwapperTradeQuoteError.SellAmountBelowMinimum:
        return tradeQuoteError.meta
          ? 'trade.errors.amountTooSmall'
          : 'trade.errors.amountTooSmallUnknownMinimum'
      case TradeQuoteValidationError.UnknownError:
      case SwapperTradeQuoteError.UnknownError:
        return 'trade.errors.quoteError'
      default:
        assertUnreachable(error)
    }
  })()

  return tradeQuoteError.meta ? [translationKey, tradeQuoteError.meta] : translationKey
}
