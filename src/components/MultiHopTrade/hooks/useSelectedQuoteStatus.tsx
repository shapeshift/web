import { useMemo } from 'react'
import { useAccountIds } from 'components/MultiHopTrade/hooks/useAccountIds'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes'
import type { QuoteStatus } from 'components/MultiHopTrade/types'
import { SelectedQuoteStatus } from 'components/MultiHopTrade/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { SwapErrorType } from 'lib/swapper/api'
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

  const selectedQuoteErrors: SelectedQuoteStatus[] = useMemo(() => {
    if (isLoading) return []
    const errors: SelectedQuoteStatus[] = []
    if (errorData) {
      if (isLoading) errors.push(SelectedQuoteStatus.Updating)
      if (errorData.code === SwapErrorType.UNSUPPORTED_PAIR)
        errors.push(SelectedQuoteStatus.NoQuotesAvailableForTradePair)
      // We didn't recognize the error, use a generic error message
      if (errors.length === 0) errors.push(SelectedQuoteStatus.UnknownError)
    } else if (quoteData) {
      if (!hasSufficientSellAssetBalance)
        errors.push(SelectedQuoteStatus.InsufficientSellAssetBalance)
    } else {
      // No quote or error data
      errors.push(SelectedQuoteStatus.NoQuotesAvailable)
    }
    return errors
  }, [errorData, hasSufficientSellAssetBalance, isLoading, quoteData])

  const quoteStatusTranslationKey = useMemo(() => {
    // Show the first error in the button
    const firstError = selectedQuoteErrors[0]
    const quoteStatusTranslationMap = new Map([
      [SelectedQuoteStatus.ReadyToPreview, 'trade.previewTrade'],
      [SelectedQuoteStatus.Loading, 'common.loadingText'],
      [SelectedQuoteStatus.Updating, 'trade.updatingQuote'],
      [SelectedQuoteStatus.InsufficientSellAssetBalance, 'common.insufficientFunds'],
      [SelectedQuoteStatus.NoQuotesAvailableForTradePair, 'trade.errors.invalidTradePairBtnText'],
      [SelectedQuoteStatus.UnknownError, 'trade.errors.quoteError'],
      [SelectedQuoteStatus.NoQuotesAvailable, 'trade.errors.noQuotesAvailable'],
    ])

    return quoteStatusTranslationMap.get(firstError) ?? 'trade.previewTrade'
  }, [selectedQuoteErrors])

  const quoteHasError = useMemo(() => {
    return selectedQuoteErrors.length > 0
  }, [selectedQuoteErrors])

  console.log('xxx quoteData', {
    quoteData,
    errorData,
    hasSufficientSellAssetBalance,
    sellAmountCryptoBaseUnit,
    sellAssetBalanceCryptoBaseUnit,
    selectedQuoteErrors,
  })

  return {
    selectedQuoteErrors,
    quoteStatusTranslationKey,
    quoteHasError,
    errorMessage,
  }
}
