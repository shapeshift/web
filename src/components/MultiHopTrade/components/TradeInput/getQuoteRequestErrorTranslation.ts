import type { InterpolationOptions } from 'node-polyglot'
import { assertUnreachable } from 'lib/utils'
import type { ErrorWithMeta } from 'state/apis/swapper/types'
import { TradeQuoteRequestError } from 'state/apis/swapper/types'

export const getQuoteRequestErrorTranslation = (
  tradeQuoteRequestError: ErrorWithMeta<TradeQuoteRequestError>,
): string | [string, InterpolationOptions] => {
  const error = tradeQuoteRequestError.error
  const translationKey = (() => {
    switch (error) {
      case TradeQuoteRequestError.NoConnectedWallet:
        return 'common.connectWallet'
      case TradeQuoteRequestError.SellAssetNotNotSupportedByWallet:
        return 'trade.errors.assetNotSupportedByWallet'
      case TradeQuoteRequestError.BuyAssetNotNotSupportedByWallet:
        return 'trade.errors.assetNotSupportedByWallet'
      case TradeQuoteRequestError.InsufficientSellAssetBalance:
        return 'common.insufficientFunds'
      case TradeQuoteRequestError.NoQuotesAvailable:
        return 'trade.errors.noQuotesAvailable'
      case TradeQuoteRequestError.NoReceiveAddress:
        return 'trade.errors.noReceiveAddress'
      default:
        assertUnreachable(error)
    }
  })()

  return tradeQuoteRequestError.meta
    ? [translationKey, tradeQuoteRequestError.meta]
    : translationKey
}
