import { useMemo } from 'react'
import { useQuoteValidationPredicateObject } from 'components/MultiHopTrade/hooks/useQuoteValidationPredicateObject'
import type { QuoteStatus } from 'components/MultiHopTrade/types'
import { ActiveQuoteStatus } from 'components/MultiHopTrade/types'
import { SwapErrorType } from 'lib/swapper/api'
import {
  selectActiveQuote,
  selectActiveQuoteError,
  selectFirstHopSellFeeAsset,
  selectLastHopSellFeeAsset,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useActiveQuoteStatus = (): QuoteStatus => {
  const {
    hasSufficientSellAssetBalance,
    firstHopHasSufficientBalanceForGas,
    lastHopHasSufficientBalanceForGas,
  } = useQuoteValidationPredicateObject()

  const firstHopSellFeeAsset = useAppSelector(selectFirstHopSellFeeAsset)
  const lastHopSellFeeAsset = useAppSelector(selectLastHopSellFeeAsset)

  const activeQuote = useAppSelector(selectActiveQuote)
  const activeQuoteError = useAppSelector(selectActiveQuoteError)

  // TODO: implement properly once we've got api loading state rigged up
  const isLoading = useMemo(
    () => !activeQuote && !activeQuoteError,
    [activeQuote, activeQuoteError],
  )

  const validationErrors: ActiveQuoteStatus[] = useMemo(() => {
    if (isLoading) return []
    const errors: ActiveQuoteStatus[] = []
    if (activeQuoteError) {
      // Map known swapper errors to quote status
      if (activeQuoteError.code === SwapErrorType.UNSUPPORTED_PAIR)
        errors.push(ActiveQuoteStatus.NoQuotesAvailableForTradePair)
      // We didn't recognize the error, use a generic error message
      if (errors.length === 0) errors.push(ActiveQuoteStatus.UnknownError)
    } else if (activeQuote) {
      // We have a quote, but something might be wrong
      if (!hasSufficientSellAssetBalance)
        errors.push(ActiveQuoteStatus.InsufficientSellAssetBalance)
      if (!firstHopHasSufficientBalanceForGas)
        errors.push(ActiveQuoteStatus.InsufficientFirstHopFeeAssetBalance)
      if (!lastHopHasSufficientBalanceForGas)
        errors.push(ActiveQuoteStatus.InsufficientLastHopFeeAssetBalance)
    } else {
      // No quote or error data
      errors.push(ActiveQuoteStatus.NoQuotesAvailable)
    }
    return errors
  }, [
    activeQuoteError,
    firstHopHasSufficientBalanceForGas,
    hasSufficientSellAssetBalance,
    isLoading,
    lastHopHasSufficientBalanceForGas,
    activeQuote,
  ])

  const quoteStatusTranslation: QuoteStatus['quoteStatusTranslation'] = useMemo(() => {
    // Show the first error in the button
    const firstError = validationErrors[0]

    return (() => {
      switch (firstError) {
        case ActiveQuoteStatus.InsufficientSellAssetBalance:
          return 'common.insufficientFunds'
        case ActiveQuoteStatus.InsufficientFirstHopFeeAssetBalance:
          return ['common.insufficientAmountForGas', { assetSymbol: firstHopSellFeeAsset?.symbol }]
        case ActiveQuoteStatus.InsufficientLastHopFeeAssetBalance:
          return ['common.insufficientAmountForGas', { assetSymbol: lastHopSellFeeAsset?.symbol }]
        case ActiveQuoteStatus.NoQuotesAvailableForTradePair:
          return 'trade.errors.invalidTradePairBtnText'
        case ActiveQuoteStatus.UnknownError:
          return 'trade.errors.quoteError'
        case ActiveQuoteStatus.NoQuotesAvailable:
          return 'trade.errors.noQuotesAvailable'
        default:
          return 'trade.previewTrade'
      }
    })()
  }, [firstHopSellFeeAsset?.symbol, lastHopSellFeeAsset?.symbol, validationErrors])

  return {
    validationErrors,
    quoteStatusTranslation,
    error: activeQuoteError,
  }
}
