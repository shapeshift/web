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
    const quoteStatusTranslationMap = new Map<
      SelectedQuoteStatus,
      QuoteStatus['quoteStatusTranslation']
    >([
      [SelectedQuoteStatus.ReadyToPreview, 'trade.previewTrade'],
      [SelectedQuoteStatus.Loading, 'common.loadingText'],
      [SelectedQuoteStatus.Updating, 'trade.updatingQuote'],
      [SelectedQuoteStatus.InsufficientSellAssetBalance, 'common.insufficientFunds'],
      [
        SelectedQuoteStatus.InsufficientFirstHopFeeAssetBalance,
        ['common.insufficientAmountForGas', { assetSymbol: firstHopSellFeeAsset?.symbol }],
      ],
      [
        SelectedQuoteStatus.InsufficientLastHopFeeAssetBalance,
        ['common.insufficientAmountForGas', { assetSymbol: lastHopSellFeeAsset?.symbol }],
      ],
      [SelectedQuoteStatus.NoQuotesAvailableForTradePair, 'trade.errors.invalidTradePairBtnText'],
      [SelectedQuoteStatus.UnknownError, 'trade.errors.quoteError'],
      [SelectedQuoteStatus.NoQuotesAvailable, 'trade.errors.noQuotesAvailable'],
    ])

    return quoteStatusTranslationMap.get(firstError) ?? 'trade.previewTrade'
  }, [selectedQuoteErrors, firstHopSellFeeAsset?.symbol, lastHopSellFeeAsset?.symbol])

  const quoteHasError = useMemo(() => {
    return selectedQuoteErrors.length > 0
  }, [selectedQuoteErrors])

  return {
    selectedQuoteErrors,
    quoteStatusTranslation,
    quoteHasError,
    errorMessage,
  }
}
