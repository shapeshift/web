import type { SupportedTradeQuoteStepIndex, TradeQuote, TradeRate } from '@shapeshiftoss/swapper'
import { getHopByIndex } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'

import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { selectUsdRateByAssetId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const usePriceImpact = (tradeQuote: TradeQuote | TradeRate | undefined) => {
  // Avoid using tradeInputSlice selectors here due to inaccurate values during debouncing.
  // Selectors update instantly, but quotes are refreshed post-request completion, leading to
  // discrepancies while fetching.
  const numSteps = tradeQuote?.steps.length ?? 0
  const sellAsset = tradeQuote?.steps[0].sellAsset
  const buyAsset = tradeQuote?.steps[numSteps - 1].buyAsset

  const sellAssetUsdRate = useAppSelector(state =>
    selectUsdRateByAssetId(state, sellAsset?.assetId ?? ''),
  )

  const buyAssetUsdRate = useAppSelector(state =>
    selectUsdRateByAssetId(state, buyAsset?.assetId ?? ''),
  )

  const sellAmountBeforeFeesUsd = useMemo(() => {
    if (!tradeQuote || !sellAsset || !sellAssetUsdRate) return

    // A quote always has a first hop
    const firstHop = getHopByIndex(tradeQuote, 0)
    const sellAmountIncludingProtocolFeesCryptoBaseUnit =
      firstHop?.sellAmountIncludingProtocolFeesCryptoBaseUnit

    const sellAmountIncludingProtocolFeesCryptoPrecision = fromBaseUnit(
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset.precision,
    )

    return bn(sellAmountIncludingProtocolFeesCryptoPrecision).times(sellAssetUsdRate).toFixed()
  }, [sellAsset, sellAssetUsdRate, tradeQuote])

  const priceImpactPercentageSigned = useMemo(() => {
    if (!tradeQuote || !buyAsset || !buyAssetUsdRate || !sellAmountBeforeFeesUsd) return

    if (tradeQuote.priceImpactPercentageDecimal) {
      return bnOrZero(tradeQuote.priceImpactPercentageDecimal).times(100)
    }

    // price impact calculation must use buyAmountBeforeFees because it relates to the liquidity in
    // the pool rather than a rate of input versus output

    const lastHopIndex = (numSteps - 1) as SupportedTradeQuoteStepIndex
    // A quote always has a last hop since it always has a first hop
    const lastHop = getHopByIndex(tradeQuote, lastHopIndex)
    const buyAmountBeforeFeesCryptoPrecision = fromBaseUnit(
      lastHop?.buyAmountBeforeFeesCryptoBaseUnit,
      buyAsset.precision,
    )

    const buyAmountBeforeFeesUsd = bnOrZero(buyAmountBeforeFeesCryptoPrecision).times(
      buyAssetUsdRate,
    )

    if (buyAmountBeforeFeesUsd.isZero()) return bn('0')

    const tradeDifference = bn(sellAmountBeforeFeesUsd).minus(buyAmountBeforeFeesUsd)

    return tradeDifference.div(sellAmountBeforeFeesUsd).times(100)
  }, [buyAsset, buyAssetUsdRate, numSteps, sellAmountBeforeFeesUsd, tradeQuote])

  const isModeratePriceImpact = useMemo(() => {
    if (!priceImpactPercentageSigned) return false

    return bn(priceImpactPercentageSigned).gt(5)
  }, [priceImpactPercentageSigned])

  const isHighPriceImpact = useMemo(() => {
    if (!priceImpactPercentageSigned) return false

    return priceImpactPercentageSigned.gt(10)
  }, [priceImpactPercentageSigned])

  const isPositivePriceImpact = useMemo(() => {
    if (!priceImpactPercentageSigned) return false

    return priceImpactPercentageSigned.lt(0)
  }, [priceImpactPercentageSigned])

  const result = useMemo(
    () => ({
      isModeratePriceImpact,
      priceImpactPercentageAbsolute: priceImpactPercentageSigned?.abs(),
      isHighPriceImpact,
      isPositivePriceImpact,
    }),
    [isHighPriceImpact, isModeratePriceImpact, isPositivePriceImpact, priceImpactPercentageSigned],
  )

  return result
}
