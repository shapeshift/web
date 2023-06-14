import { useMemo } from 'react'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes'
import { assertUnreachable } from 'lib/utils'

enum SelectedQuoteStatus {
  ReadyToPreview = 'ReadyToPreview',
  Loading = 'Loading',
  Updating = 'Updating',
  SellAmountBelowMinimum = 'SellAmountBelowMinimum',
  SellAmountBelowTradeFee = 'SellAmountBelowTradeFee',
  InsufficientSellSideFeeAssetBalance = 'InsufficientSellSideFeeAssetBalance',
  InsufficientBuySideFeeAssetBalance = 'InsufficientBuySideFeeAssetBalance',
  InsufficientSellAssetBalance = 'InsufficientSellAssetBalance',
  NoConnectedWallet = 'NoConnectedWallet',
  SellAssetNotNotSupportedByWallet = 'SellAssetNotNotSupportedByWallet',
  BuyAssetNotNotSupportedByWallet = 'BuyAssetNotNotSupportedByWallet',
  NoReceiveAddress = 'NoReceiveAddress',
  NoQuotesAvailableForTradePair = 'NoQuotesAvailableForTradePair',
  NoQuotesAvailableForSellAmount = 'NoQuotesAvailableForSellAmount',
  TradingInactiveOnSellChain = 'TradingInactiveOnSellChain',
  TradingInactiveOnBuyChain = 'TradingInactiveOnBuyChain',
}

type QuoteStatus = {
  selectedQuoteStatus: SelectedQuoteStatus
  quoteStatusTranslationKey: string
  quoteHasError: boolean
}

export const useSelectedQuoteStatus = (): QuoteStatus => {
  const { selectedQuote } = useGetTradeQuotes()
  const quoteData = useMemo(
    () => (selectedQuote?.data?.isOk() ? selectedQuote.data.unwrap() : undefined),
    [selectedQuote?.data],
  )
  const errorData = useMemo(
    () => (selectedQuote?.data?.isErr() ? selectedQuote.data.unwrapErr() : undefined),
    [selectedQuote?.data],
  )
  console.log('xxx quoteData', { quoteData, errorData })

  const selectedQuoteStatus = useMemo(() => {
    switch (true) {
      case !quoteData:
        return SelectedQuoteStatus.Loading
      default:
        return SelectedQuoteStatus.ReadyToPreview
    }
  }, [quoteData])

  const quoteStatusTranslationKey = useMemo(() => {
    switch (selectedQuoteStatus) {
      case SelectedQuoteStatus.ReadyToPreview:
        return 'trade.previewTrade'
      case SelectedQuoteStatus.Loading:
        return 'common.loadingText'
      // case SelectedQuoteStatus.Updating:
      //   return 'trade.updatingQuote'
      default:
        assertUnreachable(selectedQuoteStatus)
    }
  }, [selectedQuoteStatus])

  const quoteHasError = useMemo(() => {
    switch (selectedQuoteStatus) {
      case SelectedQuoteStatus.ReadyToPreview:
      case SelectedQuoteStatus.Loading:
        // case SelectedQuoteStatus.Updating:
        return false
      default:
        return true
    }
  }, [selectedQuoteStatus])

  return { selectedQuoteStatus, quoteStatusTranslationKey, quoteHasError }
}
