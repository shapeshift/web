import type { TradeQuote } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import {
  selectInputBuyAsset,
  selectInputBuyAssetUsdRate,
  selectInputSellAmountUsd,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const usePriceImpact = (tradeQuote: TradeQuote | undefined) => {
  const numSteps = tradeQuote?.steps.length ?? 0
  const buyAssetUsdRate = useAppSelector(selectInputBuyAssetUsdRate)
  const buyAsset = useAppSelector(selectInputBuyAsset)

  const sellAmountBeforeFeesUsd = useAppSelector(selectInputSellAmountUsd)

  // price impact calculation must use buyAmountBeforeFees because it relates to the liquidity in
  // the pool rather than a rate of input versus output
  const buyAmountBeforeCryptoPrecision = fromBaseUnit(
    tradeQuote?.steps[numSteps - 1].buyAmountBeforeFeesCryptoBaseUnit ?? '0',
    buyAsset.precision,
  )

  const priceImpactPercentage = useMemo(() => {
    const buyAmountBeforeFeesUsd = bnOrZero(buyAmountBeforeCryptoPrecision).times(
      buyAssetUsdRate ?? '0',
    )

    if (!sellAmountBeforeFeesUsd || buyAmountBeforeFeesUsd.isZero()) return bn('0')

    const tradeDifference = bn(sellAmountBeforeFeesUsd).minus(buyAmountBeforeFeesUsd)

    return tradeDifference.div(sellAmountBeforeFeesUsd).times(100)
  }, [buyAmountBeforeCryptoPrecision, buyAssetUsdRate, sellAmountBeforeFeesUsd])

  const isModeratePriceImpact = useMemo(() => {
    if (!priceImpactPercentage) return false

    return bn(priceImpactPercentage).gt(5)
  }, [priceImpactPercentage])

  const isHighPriceImpact = useMemo(() => {
    if (!priceImpactPercentage) return false

    return priceImpactPercentage.gt(10)
  }, [priceImpactPercentage])

  return { isModeratePriceImpact, priceImpactPercentage, isHighPriceImpact }
}
