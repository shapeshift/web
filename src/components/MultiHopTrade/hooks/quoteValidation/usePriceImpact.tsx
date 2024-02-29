import type { TradeQuote } from '@shapeshiftoss/swapper'
import { useCallback, useMemo } from 'react'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { ReduxState } from 'state/reducer'
import { selectUsdRateByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const usePriceImpact = (tradeQuote: TradeQuote | undefined) => {
  // Avoid using tradeInputSlice selectors here due to inaccurate values during debouncing.
  // Selectors update instantly, but quotes are refreshed post-request completion, leading to
  // discrepancies while fetching.
  const numSteps = tradeQuote?.steps.length ?? 0
  const sellAsset = tradeQuote?.steps[0].sellAsset
  const buyAsset = tradeQuote?.steps[numSteps - 1].buyAsset

  const sellAssetUsdRateCallback = useCallback(
    (state: ReduxState) => selectUsdRateByAssetId(state, sellAsset?.assetId ?? ''),
    [sellAsset?.assetId],
  )

  const buyAssetUsdRateCallback = useCallback(
    (state: ReduxState) => selectUsdRateByAssetId(state, buyAsset?.assetId ?? ''),
    [buyAsset?.assetId],
  )

  const sellAssetUsdRate = useAppSelector(sellAssetUsdRateCallback)
  const buyAssetUsdRate = useAppSelector(buyAssetUsdRateCallback)

  const sellAmountBeforeFeesUsd = useMemo(() => {
    if (!tradeQuote || !sellAsset || !sellAssetUsdRate) return

    const sellAmountIncludingProtocolFeesCryptoBaseUnit =
      tradeQuote.steps[0].sellAmountIncludingProtocolFeesCryptoBaseUnit

    const sellAmountIncludingProtocolFeesCryptoPrecision = fromBaseUnit(
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset.precision,
    )

    return bn(sellAmountIncludingProtocolFeesCryptoPrecision).times(sellAssetUsdRate).toFixed()
  }, [sellAsset, sellAssetUsdRate, tradeQuote])

  const priceImpactPercentage = useMemo(() => {
    if (!tradeQuote || !buyAsset || !buyAssetUsdRate || !sellAmountBeforeFeesUsd) return

    // price impact calculation must use buyAmountBeforeFees because it relates to the liquidity in
    // the pool rather than a rate of input versus output
    const buyAmountBeforeFeesCryptoPrecision = fromBaseUnit(
      tradeQuote.steps[numSteps - 1].buyAmountBeforeFeesCryptoBaseUnit,
      buyAsset.precision,
    )

    const buyAmountBeforeFeesUsd = bnOrZero(buyAmountBeforeFeesCryptoPrecision).times(
      buyAssetUsdRate,
    )

    if (buyAmountBeforeFeesUsd.isZero()) return bn('0')

    const tradeDifference = bn(sellAmountBeforeFeesUsd).minus(buyAmountBeforeFeesUsd)

    return tradeDifference.div(sellAmountBeforeFeesUsd).times(100).abs()
  }, [buyAsset, buyAssetUsdRate, numSteps, sellAmountBeforeFeesUsd, tradeQuote])

  const isModeratePriceImpact = useMemo(() => {
    if (!priceImpactPercentage) return false

    return bn(priceImpactPercentage).gt(5)
  }, [priceImpactPercentage])

  const isHighPriceImpact = useMemo(() => {
    if (!priceImpactPercentage) return false

    return priceImpactPercentage.gt(10)
  }, [priceImpactPercentage])

  return useMemo(
    () => ({ isModeratePriceImpact, priceImpactPercentage, isHighPriceImpact }),
    [isHighPriceImpact, isModeratePriceImpact, priceImpactPercentage],
  )
}
