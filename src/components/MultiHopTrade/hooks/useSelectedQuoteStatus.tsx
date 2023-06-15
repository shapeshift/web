import { ethAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useAccountIds } from 'components/MultiHopTrade/hooks/useAccountIds'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes'
import type { QuoteStatus } from 'components/MultiHopTrade/types'
import { SelectedQuoteStatus } from 'components/MultiHopTrade/types'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { SwapErrorType, SwapperName } from 'lib/swapper/api'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import {
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/common-selectors'
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

  const firstHop = useMemo(() => quoteData?.steps[0], [quoteData?.steps])
  const lastHop = useMemo(() => quoteData?.steps[quoteData.steps.length - 1], [quoteData?.steps])

  const isLoading = useMemo(() => selectedQuote?.isLoading, [selectedQuote?.isLoading])
  const sellAmountCryptoBaseUnit = useMemo(
    () => firstHop?.sellAmountBeforeFeesCryptoBaseUnit,
    [firstHop?.sellAmountBeforeFeesCryptoBaseUnit],
  )

  const firstHopSellAsset = useMemo(() => firstHop?.sellAsset, [firstHop?.sellAsset])
  const firstHopBuyAsset = useMemo(() => firstHop?.buyAsset, [firstHop?.buyAsset])
  const lastHopSellAsset = useMemo(() => lastHop?.sellAsset, [lastHop?.sellAsset])
  const lastHopBuyAsset = useMemo(() => lastHop?.buyAsset, [lastHop?.buyAsset])

  const { sellAssetAccountId: firstHopSellAssetAccountId } = useAccountIds({
    buyAsset: firstHopBuyAsset,
    sellAsset: firstHopSellAsset,
  })

  const { sellAssetAccountId: lastHopSellAssetAccountId } = useAccountIds({
    buyAsset: lastHopBuyAsset,
    sellAsset: lastHopSellAsset,
  })

  const sellAssetBalanceFilter = useMemo(
    () => ({ accountId: firstHopSellAssetAccountId, assetId: firstHopSellAsset?.assetId ?? '' }),
    [firstHopSellAssetAccountId, firstHopSellAsset?.assetId],
  )

  const sellAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, sellAssetBalanceFilter),
  )

  const hasSufficientSellAssetBalance = bnOrZero(sellAssetBalanceCryptoBaseUnit).gte(
    bnOrZero(sellAmountCryptoBaseUnit),
  )

  const firstHopSellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, firstHopSellAsset?.assetId ?? ethAssetId),
  )

  const lastHopSellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, lastHopSellAsset?.assetId ?? ethAssetId),
  )

  const firstHopFeeAssetBalanceFilter = useMemo(
    () => ({ assetId: firstHopSellFeeAsset?.assetId, accountId: firstHopSellAssetAccountId ?? '' }),
    [firstHopSellAssetAccountId, firstHopSellFeeAsset?.assetId],
  )

  const lastHopFeeAssetBalanceFilter = useMemo(
    () => ({ assetId: lastHopSellFeeAsset?.assetId, accountId: lastHopSellAssetAccountId ?? '' }),
    [lastHopSellAssetAccountId, lastHopSellFeeAsset?.assetId],
  )

  const firstHopFeeAssetBalancePrecision = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, firstHopFeeAssetBalanceFilter),
  )

  const lastHopFeeAssetBalancePrecision = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, lastHopFeeAssetBalanceFilter),
  )

  const selectedSwapperName = useMemo(
    () => selectedQuote?.swapperName,
    [selectedQuote?.swapperName],
  )

  // TODO(woodenfurniture): update swappers to specify this as with protocol fees
  const networkFeeRequiresBalance = selectedSwapperName !== SwapperName.CowSwap

  const sellAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(bnOrZero(sellAmountCryptoBaseUnit), firstHopSellAsset?.precision),
    [sellAmountCryptoBaseUnit, firstHopSellAsset?.precision],
  )
  // when trading from fee asset, the value of TX in fee asset is deducted
  const firstHopTradeDeductionCryptoPrecision =
    firstHopSellFeeAsset?.assetId === firstHopSellAsset?.assetId
      ? bnOrZero(sellAmountCryptoPrecision)
      : bn(0)

  const firstHopNetworkFeeCryptoPrecision = useMemo(
    () =>
      networkFeeRequiresBalance && firstHopSellFeeAsset
        ? fromBaseUnit(
            bnOrZero(firstHop?.feeData.networkFeeCryptoBaseUnit),
            firstHopSellFeeAsset.precision,
          )
        : bn(0),
    [firstHop?.feeData.networkFeeCryptoBaseUnit, networkFeeRequiresBalance, firstHopSellFeeAsset],
  )

  const lastHopNetworkFeeCryptoPrecision = useMemo(
    () =>
      networkFeeRequiresBalance && lastHopSellFeeAsset
        ? fromBaseUnit(
            bnOrZero(lastHop?.feeData.networkFeeCryptoBaseUnit),
            lastHopSellFeeAsset.precision,
          )
        : bn(0),
    [lastHop?.feeData.networkFeeCryptoBaseUnit, networkFeeRequiresBalance, lastHopSellFeeAsset],
  )

  // fixme: move to a predicate object hook
  const firstHopHasSufficientBalanceForGas = bnOrZero(firstHopFeeAssetBalancePrecision)
    .minus(firstHopNetworkFeeCryptoPrecision)
    .minus(firstHopTradeDeductionCryptoPrecision)
    .gte(0)

  const lastHopHasSufficientBalanceForGas = bnOrZero(lastHopFeeAssetBalancePrecision)
    .minus(lastHopNetworkFeeCryptoPrecision)
    .gte(0)

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

  console.log('xxx quoteData', {
    quoteData,
    errorData,
    hasSufficientSellAssetBalance,
    sellAmountCryptoBaseUnit,
    sellAssetBalanceCryptoBaseUnit,
    selectedQuoteErrors,
    firstHopHasSufficientBalanceForGas,
    firstHopFeeAssetBalancePrecision,
    networkFeeRequiresBalance,
    firstHopTradeDeductionCryptoPrecision,
    lastHopHasSufficientBalanceForGas,
    lastHopSellFeeAsset,
    lastHopSellAsset,
  })

  return {
    selectedQuoteErrors,
    quoteStatusTranslation,
    quoteHasError,
    errorMessage,
  }
}
