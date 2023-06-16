import { useMemo } from 'react'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes'
import { useHopHelper } from 'components/MultiHopTrade/hooks/useHopHelper'
import { useQuoteValidationPredicateObject } from 'components/MultiHopTrade/hooks/useQuoteValidationPredicateObject'
import type { QuoteStatus } from 'components/MultiHopTrade/types'
import { SelectedQuoteStatus } from 'components/MultiHopTrade/types'
import { SwapErrorType } from 'lib/swapper/api'

export const useSelectedQuoteStatus = (): QuoteStatus => {
  const {
    hasSufficientSellAssetBalance,
    firstHopHasSufficientBalanceForGas,
    lastHopHasSufficientBalanceForGas,
  } = useQuoteValidationPredicateObject()

  const { firstHopSellFeeAsset, lastHopSellFeeAsset } = useHopHelper()

  const { selectedQuote } = useGetTradeQuotes()
  const quoteData = useMemo(
    () => (selectedQuote?.data?.isOk() ? selectedQuote.data.unwrap() : undefined),
    [selectedQuote?.data],
  )
  const errorData = useMemo(
    () => (selectedQuote?.data?.isErr() ? selectedQuote.data.unwrapErr() : undefined),
    [selectedQuote?.data],
  )

  const errorMessage = errorData?.message

  const isLoading = useMemo(() => selectedQuote?.isLoading, [selectedQuote?.isLoading])

  const selectedQuoteErrors: SelectedQuoteStatus[] = useMemo(() => {
    if (isLoading) return []
    const errors: SelectedQuoteStatus[] = []
    if (errorData) {
      // Map known swapper errors to quote status
      if (errorData.code === SwapErrorType.UNSUPPORTED_PAIR)
        errors.push(SelectedQuoteStatus.NoQuotesAvailableForTradePair)
      // We didn't recognize the error, use a generic error message
      if (errors.length === 0) errors.push(SelectedQuoteStatus.UnknownError)
    } else if (quoteData) {
      // We have a quote, but something might be wrong
      if (!hasSufficientSellAssetBalance)
        errors.push(SelectedQuoteStatus.InsufficientSellAssetBalance)
      if (!firstHopHasSufficientBalanceForGas)
        errors.push(SelectedQuoteStatus.InsufficientFirstHopFeeAssetBalance)
      if (!lastHopHasSufficientBalanceForGas)
        errors.push(SelectedQuoteStatus.InsufficientLastHopFeeAssetBalance)
    } else {
      // No quote or error data
      errors.push(SelectedQuoteStatus.NoQuotesAvailable)
    }
    return errors
  }, [
    errorData,
    firstHopHasSufficientBalanceForGas,
    hasSufficientSellAssetBalance,
    isLoading,
    lastHopHasSufficientBalanceForGas,
    quoteData,
  ])

  const quoteStatusTranslation: QuoteStatus['quoteStatusTranslation'] = useMemo(() => {
    // Show the first error in the button
    const firstError = selectedQuoteErrors[0]

    return (() => {
      switch (firstError) {
        case SelectedQuoteStatus.ReadyToPreview:
          return 'trade.previewTrade'
        case SelectedQuoteStatus.Loading:
          return 'common.loadingText'
        case SelectedQuoteStatus.Updating:
          return 'trade.updatingQuote'
        case SelectedQuoteStatus.InsufficientSellAssetBalance:
          return 'common.insufficientFunds'
        case SelectedQuoteStatus.InsufficientFirstHopFeeAssetBalance:
          return 'common.insufficientAmountForGas'
        case SelectedQuoteStatus.InsufficientLastHopFeeAssetBalance:
          return 'common.insufficientAmountForGas'
        case SelectedQuoteStatus.NoQuotesAvailableForTradePair:
          return 'trade.errors.invalidTradePairBtnText'
        case SelectedQuoteStatus.UnknownError:
          return 'trade.errors.quoteError'
        case SelectedQuoteStatus.NoQuotesAvailable:
          return 'trade.errors.noQuotesAvailable'
        default:
          return 'trade.previewTrade'
      }
    })()
  }, [selectedQuoteErrors])

  return {
    selectedQuoteErrors,
    quoteStatusTranslation,
    errorMessage,
  }
}
