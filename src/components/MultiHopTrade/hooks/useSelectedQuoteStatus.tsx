import { useMemo } from 'react'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes'
import { useQuoteValidationPredicateObject } from 'components/MultiHopTrade/hooks/useQuoteValidationPredicateObject'
import type { QuoteStatus } from 'components/MultiHopTrade/types'
import { SelectedQuoteStatus } from 'components/MultiHopTrade/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { SwapErrorType, SwapperName } from 'lib/swapper/api'
import {
  selectFirstHopSellAsset,
  selectFirstHopSellFeeAsset,
  selectLastHopSellFeeAsset,
  selectMinimumSellAmountCryptoHuman,
  selectSelectedSwapperName,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useSelectedQuoteStatus = (): QuoteStatus => {
  const {
    hasSufficientSellAssetBalance,
    firstHopHasSufficientBalanceForGas,
    lastHopHasSufficientBalanceForGas,
    isBelowMinimumSellAmount,
  } = useQuoteValidationPredicateObject()

  const selectedSwapperName = useAppSelector(selectSelectedSwapperName)
  const firstHopSellFeeAsset = useAppSelector(selectFirstHopSellFeeAsset)
  const firstHopSellAssest = useAppSelector(selectFirstHopSellAsset)
  const lastHopSellFeeAsset = useAppSelector(selectLastHopSellFeeAsset)
  const minimumCryptoHuman = useAppSelector(selectMinimumSellAmountCryptoHuman)

  const { selectedQuote } = useGetTradeQuotes()
  const quoteData = useMemo(
    () => (selectedQuote?.data?.isOk() ? selectedQuote.data.unwrap() : undefined),
    [selectedQuote?.data],
  )
  const errorData = useMemo(
    () => (selectedQuote?.data?.isErr() ? selectedQuote.data.unwrapErr() : undefined),
    [selectedQuote?.data],
  )

  const isLoading = useMemo(() => selectedQuote?.isLoading, [selectedQuote?.isLoading])

  // Build a list of validation errors
  const validationErrors: SelectedQuoteStatus[] = useMemo(() => {
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
      if (isBelowMinimumSellAmount) errors.push(SelectedQuoteStatus.SellAmountBelowMinimum)
    } else {
      // No quote or error data
      errors.push(SelectedQuoteStatus.NoQuotesAvailable)
    }
    return errors
  }, [
    errorData,
    firstHopHasSufficientBalanceForGas,
    hasSufficientSellAssetBalance,
    isBelowMinimumSellAmount,
    isLoading,
    lastHopHasSufficientBalanceForGas,
    quoteData,
  ])

  const minimumAmountUserMessage = `${bnOrZero(minimumCryptoHuman).decimalPlaces(6)} ${
    firstHopSellAssest?.symbol
  }`

  // Map validation errors to translation stings
  const quoteStatusTranslation: QuoteStatus['quoteStatusTranslation'] = useMemo(() => {
    // Show the first error in the button
    const firstError = validationErrors[0]

    // Return a translation string based on the first error. We might want to show multiple one day.
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
        case SelectedQuoteStatus.SellAmountBelowMinimum:
          return selectedSwapperName && [SwapperName.LIFI].includes(selectedSwapperName)
            ? 'trade.errors.amountTooSmallOrInvalidTradePair'
            : ['trade.errors.amountTooSmall', { minLimit: minimumAmountUserMessage }]
        default:
          return 'trade.previewTrade'
      }
    })()
  }, [
    firstHopSellFeeAsset?.symbol,
    lastHopSellFeeAsset?.symbol,
    minimumAmountUserMessage,
    selectedSwapperName,
    validationErrors,
  ])

  return {
    validationErrors,
    quoteStatusTranslation,
    error: errorData,
  }
}
