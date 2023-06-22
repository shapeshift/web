import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes'
import { useQuoteValidationErrors } from 'components/MultiHopTrade/hooks/useQuoteValidationErrors'
import type { QuoteStatus } from 'components/MultiHopTrade/types'
import { SelectedQuoteStatus } from 'components/MultiHopTrade/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { SwapErrorType, SwapperName } from 'lib/swapper/api'
import {
  selectFirstHopSellAsset,
  selectFirstHopSellFeeAsset,
  selectLastHopBuyAsset,
  selectLastHopSellFeeAsset,
  selectMinimumSellAmountCryptoHuman,
  selectSelectedSwapperName,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useSelectedQuoteStatus = (): QuoteStatus => {
  const validationErrors = useQuoteValidationErrors()
  const translate = useTranslate()

  const selectedSwapperName = useAppSelector(selectSelectedSwapperName)
  const firstHopSellFeeAsset = useAppSelector(selectFirstHopSellFeeAsset)
  const firstHopSellAsset = useAppSelector(selectFirstHopSellAsset)
  const lastHopSellFeeAsset = useAppSelector(selectLastHopSellFeeAsset)
  const lastHopBuyAsset = useAppSelector(selectLastHopBuyAsset)
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
  const quoteErrors: SelectedQuoteStatus[] = useMemo(() => {
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
      return validationErrors
    } else {
      // No quote or error data
      errors.push(SelectedQuoteStatus.NoQuotesAvailable)
    }
    return errors
  }, [errorData, isLoading, quoteData, validationErrors])

  const minimumAmountUserMessage = `${bnOrZero(minimumCryptoHuman).decimalPlaces(6)} ${
    firstHopSellAsset?.symbol
  }`

  // Map validation errors to translation stings
  const quoteStatusTranslation: QuoteStatus['quoteStatusTranslation'] = useMemo(() => {
    // Show the first error in the button
    const firstError = quoteErrors[0]

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
        case SelectedQuoteStatus.SellAssetNotNotSupportedByWallet:
          return [
            'trade.errors.assetNotSupportedByWallet',
            {
              assetSymbol:
                firstHopSellAsset?.symbol ?? translate('trade.errors.sellAssetStartSentence'),
            },
          ]
        case SelectedQuoteStatus.NoReceiveAddress:
          return [
            'trade.errors.noReceiveAddress',
            {
              assetSymbol:
                lastHopBuyAsset?.symbol ?? translate('trade.errors.buyAssetMiddleSentence'),
            },
          ]
        case SelectedQuoteStatus.BuyAssetNotNotSupportedByWallet: // TODO: add translation for manual receive address required once implemented
        default:
          return 'trade.previewTrade'
      }
    })()
  }, [
    quoteErrors,
    firstHopSellFeeAsset?.symbol,
    lastHopSellFeeAsset?.symbol,
    selectedSwapperName,
    minimumAmountUserMessage,
    firstHopSellAsset?.symbol,
    translate,
    lastHopBuyAsset?.symbol,
  ])

  return {
    quoteErrors,
    quoteStatusTranslation,
    error: errorData,
  }
}
