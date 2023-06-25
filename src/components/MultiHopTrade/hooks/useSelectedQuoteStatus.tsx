import { useMemo } from 'react'
import { useQuoteValidationPredicateObject } from 'components/MultiHopTrade/hooks/useQuoteValidationPredicateObject'
import type { QuoteStatus } from 'components/MultiHopTrade/types'
import { SelectedQuoteStatus } from 'components/MultiHopTrade/types'
import { SwapErrorType } from 'lib/swapper/api'
import {
  selectFirstHopSellFeeAsset,
  selectLastHopSellFeeAsset,
  selectSelectedQuote,
  selectSelectedQuoteError,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useSelectedQuoteStatus = (): QuoteStatus => {
  const {
    hasSufficientSellAssetBalance,
    firstHopHasSufficientBalanceForGas,
    lastHopHasSufficientBalanceForGas,
  } = useQuoteValidationPredicateObject()

  const firstHopSellFeeAsset = useAppSelector(selectFirstHopSellFeeAsset)
  const lastHopSellFeeAsset = useAppSelector(selectLastHopSellFeeAsset)
  const selectedQuote = useAppSelector(selectSelectedQuote)
  const selectedQuoteError = useAppSelector(selectSelectedQuoteError)

  const isLoading = false // fixme

  const validationErrors: SelectedQuoteStatus[] = useMemo(() => {
    if (isLoading) return []
    const errors: SelectedQuoteStatus[] = []
    if (selectedQuoteError) {
      // Map known swapper errors to quote status
      if (selectedQuoteError.code === SwapErrorType.UNSUPPORTED_PAIR)
        errors.push(SelectedQuoteStatus.NoQuotesAvailableForTradePair)
      // We didn't recognize the error, use a generic error message
      if (errors.length === 0) errors.push(SelectedQuoteStatus.UnknownError)
    } else if (selectedQuote) {
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
    firstHopHasSufficientBalanceForGas,
    hasSufficientSellAssetBalance,
    isLoading,
    lastHopHasSufficientBalanceForGas,
    selectedQuote,
    selectedQuoteError,
  ])

  const quoteStatusTranslation: QuoteStatus['quoteStatusTranslation'] = useMemo(() => {
    // Show the first error in the button
    const firstError = validationErrors[0]

    return (() => {
      switch (firstError) {
        case SelectedQuoteStatus.InsufficientSellAssetBalance:
          return 'common.insufficientFunds'
        case SelectedQuoteStatus.InsufficientFirstHopFeeAssetBalance:
          return ['common.insufficientAmountForGas', { assetSymbol: firstHopSellFeeAsset?.symbol }]
        case SelectedQuoteStatus.InsufficientLastHopFeeAssetBalance:
          return ['common.insufficientAmountForGas', { assetSymbol: lastHopSellFeeAsset?.symbol }]
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
  }, [firstHopSellFeeAsset?.symbol, lastHopSellFeeAsset?.symbol, validationErrors])

  return {
    validationErrors,
    quoteStatusTranslation,
    error: selectedQuoteError,
  }
}
