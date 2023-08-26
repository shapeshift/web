import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useInsufficientBalanceProtocolFeeMeta } from 'components/MultiHopTrade/hooks/quoteValidation/useInsufficientBalanceProtocolFeeMeta'
import { useQuoteValidationErrors } from 'components/MultiHopTrade/hooks/quoteValidation/useQuoteValidationErrors'
import type { QuoteStatus } from 'components/MultiHopTrade/types'
import { ActiveQuoteStatus } from 'components/MultiHopTrade/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { SwapErrorType } from 'lib/swapper/api'
import {
  selectBuyAsset,
  selectSellAmountCryptoPrecision,
} from 'state/slices/swappersSlice/selectors'
import {
  selectActiveQuote,
  selectActiveQuoteError,
  selectFirstHopSellAsset,
  selectFirstHopSellFeeAsset,
  selectLastHopSellFeeAsset,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useActiveQuoteStatus = (): QuoteStatus => {
  const validationErrors = useQuoteValidationErrors()
  const translate = useTranslate()

  const firstHopSellAsset = useAppSelector(selectFirstHopSellAsset)
  const firstHopSellFeeAsset = useAppSelector(selectFirstHopSellFeeAsset)
  const lastHopSellFeeAsset = useAppSelector(selectLastHopSellFeeAsset)
  const tradeBuyAsset = useAppSelector(selectBuyAsset)
  const sellAmountCryptoPrecision = useAppSelector(selectSellAmountCryptoPrecision)

  const insufficientBalanceProtocolFeeMeta = useInsufficientBalanceProtocolFeeMeta()

  const activeQuote = useAppSelector(selectActiveQuote)
  const activeQuoteError = useAppSelector(selectActiveQuoteError)

  const hasUserEnteredAmount = useMemo(
    () => bnOrZero(sellAmountCryptoPrecision).gt(0),
    [sellAmountCryptoPrecision],
  )

  // TODO: implement properly once we've got api loading state rigged up
  const isLoading = useMemo(
    () => !activeQuote && !activeQuoteError,
    [activeQuote, activeQuoteError],
  )

  const quoteErrors: ActiveQuoteStatus[] = useMemo(() => {
    if (isLoading || !hasUserEnteredAmount) return []

    const errors: ActiveQuoteStatus[] = []

    if (activeQuoteError) {
      // Map known swapper errors to quote status

      const errorData = (() => {
        switch (activeQuoteError.code) {
          case SwapErrorType.UNSUPPORTED_PAIR:
            return ActiveQuoteStatus.NoQuotesAvailableForTradePair
          default:
            // We didn't recognize the error, use a generic error message
            return ActiveQuoteStatus.UnknownError
        }
      })()

      errors.push(errorData)
    } else if (activeQuote) {
      // We have a quote, but something might be wrong
      return validationErrors
    } else {
      // No quote or error data
      errors.push(ActiveQuoteStatus.NoQuotesAvailable)
    }
    return errors
  }, [isLoading, hasUserEnteredAmount, activeQuoteError, activeQuote, validationErrors])

  // Map validation errors to translation stings
  const quoteStatusTranslation: QuoteStatus['quoteStatusTranslation'] = useMemo(() => {
    // Show the first error in the button
    const firstError = quoteErrors[0]

    // Return a translation string based on the first error. We might want to show multiple one day.
    return (() => {
      switch (firstError) {
        case ActiveQuoteStatus.NoConnectedWallet:
          return 'common.connectWallet'
        case ActiveQuoteStatus.BuyAssetNotNotSupportedByWallet:
          return ['trade.errors.noReceiveAddress', { assetSymbol: tradeBuyAsset?.symbol }]
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
        case ActiveQuoteStatus.SellAssetNotNotSupportedByWallet:
          return [
            'trade.errors.assetNotSupportedByWallet',
            {
              assetSymbol:
                firstHopSellAsset?.symbol ?? translate('trade.errors.sellAssetStartSentence'),
            },
          ]
        case ActiveQuoteStatus.NoReceiveAddress:
          return [
            'trade.errors.noReceiveAddress',
            {
              assetSymbol:
                tradeBuyAsset?.symbol ?? translate('trade.errors.buyAssetMiddleSentence'),
            },
          ]
        case ActiveQuoteStatus.SellAmountBelowTradeFee:
          return 'trade.errors.sellAmountDoesNotCoverFee'
        case ActiveQuoteStatus.InsufficientFundsForProtocolFee:
          return [
            'trade.errors.insufficientFundsForProtocolFee',
            insufficientBalanceProtocolFeeMeta ?? {},
          ]
        default:
          return 'trade.previewTrade'
      }
    })()
  }, [
    quoteErrors,
    tradeBuyAsset?.symbol,
    firstHopSellFeeAsset?.symbol,
    lastHopSellFeeAsset?.symbol,
    firstHopSellAsset,
    translate,
    insufficientBalanceProtocolFeeMeta,
  ])

  return {
    quoteErrors,
    quoteStatusTranslation,
    error: activeQuoteError,
  }
}
