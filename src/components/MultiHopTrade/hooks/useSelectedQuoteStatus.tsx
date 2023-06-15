import { useMemo } from 'react'
import { useAccountIds } from 'components/MultiHopTrade/hooks/useAccountIds'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes'
import type { QuoteStatus } from 'components/MultiHopTrade/types'
import { SelectedQuoteStatus } from 'components/MultiHopTrade/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { SwapErrorType } from 'lib/swapper/api'
import { assertUnreachable } from 'lib/utils'
import { selectPortfolioCryptoBalanceBaseUnitByFilter } from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'

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

  const errorMessage = errorData?.message

  const hop1 = useMemo(() => quoteData?.steps[0], [quoteData?.steps])

  const isLoading = useMemo(() => selectedQuote?.isLoading, [selectedQuote?.isLoading])
  const sellAmountCryptoBaseUnit = useMemo(
    () => hop1?.sellAmountBeforeFeesCryptoBaseUnit,
    [hop1?.sellAmountBeforeFeesCryptoBaseUnit],
  )

  const sellAsset = useMemo(() => hop1?.sellAsset, [hop1?.sellAsset])
  const buyAsset = useMemo(() => hop1?.buyAsset, [hop1?.buyAsset])
  const { sellAssetAccountId } = useAccountIds({
    buyAsset,
    sellAsset,
  })

  const sellAssetBalanceFilter = useMemo(
    () => ({ accountId: sellAssetAccountId, assetId: sellAsset?.assetId ?? '' }),
    [sellAssetAccountId, sellAsset?.assetId],
  )

  const sellAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, sellAssetBalanceFilter),
  )

  const hasSufficientSellAssetBalance = bnOrZero(sellAssetBalanceCryptoBaseUnit).gte(
    bnOrZero(sellAmountCryptoBaseUnit),
  )

  console.log('xxx quoteData', {
    quoteData,
    errorData,
    hasSufficientSellAssetBalance,
    sellAmountCryptoBaseUnit,
    sellAssetBalanceCryptoBaseUnit,
  })

  // fixme: maybe this returns an array of errors?
  const selectedQuoteStatus = useMemo(() => {
    if (errorData) {
      if (isLoading) return SelectedQuoteStatus.Updating
      switch (errorData.code) {
        case SwapErrorType.UNSUPPORTED_PAIR:
          return SelectedQuoteStatus.NoQuotesAvailableForTradePair
        default:
          // We have an error, but it's not known
          return SelectedQuoteStatus.UnknownError
      }
    } else if (quoteData) {
      // We have a quote, work out the status
      switch (true) {
        // We have a quote, but we're also looking for a quote, so we are updating it
        case isLoading:
          return SelectedQuoteStatus.Updating
        case !hasSufficientSellAssetBalance:
          return SelectedQuoteStatus.InsufficientSellAssetBalance
        default:
          // We didn't hit any known errors states, so we claim that we're ready to preview
          return SelectedQuoteStatus.ReadyToPreview
      }
    } else {
      switch (true) {
        case isLoading:
          return SelectedQuoteStatus.Loading
        default:
          // We don't have a quote, or an error, and we aren't looking for any`
          return SelectedQuoteStatus.NoQuotesAvailable
      }
    }
  }, [errorData, hasSufficientSellAssetBalance, isLoading, quoteData])

  const quoteStatusTranslationKey = useMemo(() => {
    switch (selectedQuoteStatus) {
      case SelectedQuoteStatus.ReadyToPreview:
        return 'trade.previewTrade'
      case SelectedQuoteStatus.Loading:
        return 'common.loadingText'
      case SelectedQuoteStatus.Updating:
        return 'trade.updatingQuote'
      case SelectedQuoteStatus.InsufficientSellAssetBalance:
        return 'common.insufficientFunds'
      case SelectedQuoteStatus.NoQuotesAvailableForTradePair:
        return 'trade.errors.invalidTradePairBtnText'
      case SelectedQuoteStatus.UnknownError:
        return 'trade.errors.quoteError'
      case SelectedQuoteStatus.NoQuotesAvailable:
        return 'trade.errors.noQuotesAvailable'
      default:
        assertUnreachable(selectedQuoteStatus)
    }
  }, [selectedQuoteStatus])

  const quoteHasError = useMemo(() => {
    switch (selectedQuoteStatus) {
      case SelectedQuoteStatus.ReadyToPreview:
      case SelectedQuoteStatus.Loading:
      case SelectedQuoteStatus.Updating:
        return false
      default:
        return true
    }
  }, [selectedQuoteStatus])

  return { selectedQuoteStatus, quoteStatusTranslationKey, quoteHasError, errorMessage }
}
