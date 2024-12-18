import { TradeQuoteError as SwapperTradeQuoteError } from '@shapeshiftoss/swapper'
import type { InterpolationOptions } from 'node-polyglot'
import { assertUnreachable } from 'lib/utils'
import type { ErrorWithMeta, TradeQuoteError } from 'state/apis/swapper/types'
import { TradeQuoteValidationError } from 'state/apis/swapper/types'

export const getQuoteErrorTranslation = (
  tradeQuoteError: ErrorWithMeta<TradeQuoteError>,
): string | [string, InterpolationOptions] => {
  const error = tradeQuoteError.error
  const translationKey = (() => {
    switch (error) {
      case SwapperTradeQuoteError.UnsupportedTradePair:
        return 'trade.errors.unsupportedTradePair'
      case SwapperTradeQuoteError.NoRouteFound:
        return 'trade.errors.noRouteFound'
      case SwapperTradeQuoteError.TradingHalted:
        return 'trade.errors.tradingNotActiveNoAssetSymbol'
      case TradeQuoteValidationError.TradingInactiveOnSellChain:
        return 'trade.errors.tradingNotActiveForChain'
      case TradeQuoteValidationError.TradingInactiveOnBuyChain:
        return 'trade.errors.tradingNotActiveForChain'
      case TradeQuoteValidationError.SellAmountBelowTradeFee:
      case SwapperTradeQuoteError.SellAmountBelowTradeFee:
        return 'trade.errors.sellAmountDoesNotCoverFee'
      case TradeQuoteValidationError.InsufficientFirstHopAssetBalance:
        return 'common.insufficientFundsForTrade'
      case TradeQuoteValidationError.InsufficientFirstHopFeeAssetBalance:
        return 'common.insufficientAmountForGas'
      case TradeQuoteValidationError.InsufficientSecondHopFeeAssetBalance:
        return 'common.insufficientAmountForGas'
      case TradeQuoteValidationError.InsufficientFundsForProtocolFee:
        return 'trade.errors.insufficientFundsForProtocolFee'
      case TradeQuoteValidationError.IntermediaryAssetNotNotSupportedByWallet:
        return 'trade.errors.intermediaryAssetNotSupportedByWallet'
      case SwapperTradeQuoteError.SellAmountBelowMinimum:
        return tradeQuoteError.meta
          ? 'trade.errors.amountTooSmall'
          : 'trade.errors.amountTooSmallUnknownMinimum'
      case SwapperTradeQuoteError.UnsupportedChain:
        return 'trade.errors.quoteUnsupportedChain'
      case SwapperTradeQuoteError.CrossChainNotSupported:
        return 'trade.errors.quoteCrossChainNotSupported'
      case SwapperTradeQuoteError.NetworkFeeEstimationFailed:
        return 'trade.errors.networkFeeEstimateFailed'
      case SwapperTradeQuoteError.RateLimitExceeded:
        return 'trade.errors.rateLimitExceeded'
      case SwapperTradeQuoteError.FinalQuoteMaxSlippageExceeded:
        return 'trade.errors.maxSlippageExceededWithExpectedSlippage'
      case SwapperTradeQuoteError.FinalQuoteExecutionReverted:
        return 'trade.errors.executionRevertedWithExpectedSlippage'
      case TradeQuoteValidationError.UnknownError:
      case SwapperTradeQuoteError.UnknownError:
      case SwapperTradeQuoteError.InternalError:
      case TradeQuoteValidationError.QueryFailed:
      case SwapperTradeQuoteError.QueryFailed:
      case TradeQuoteValidationError.QuoteSellAmountInvalid:
      case SwapperTradeQuoteError.InvalidResponse:
        return 'trade.errors.quoteError'
      default:
        assertUnreachable(error)
    }
  })()

  return tradeQuoteError.meta ? [translationKey, tradeQuoteError.meta] : translationKey
}
