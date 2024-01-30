import type { TradeQuote } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectInputBuyAssetUsdRate, selectInputSellAmountUsd } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const usePriceImpact = (tradeQuote: TradeQuote | undefined) => {
  const numSteps = tradeQuote?.steps.length ?? 0

  const sellAmountBeforeFeesUsd = useAppSelector(selectInputSellAmountUsd)
  const buyAmountBeforeFeesCryptoBaseUnit =
    tradeQuote?.steps[numSteps - 1].buyAmountBeforeFeesCryptoBaseUnit

  const buyAssetUsdRate = useAppSelector(selectInputBuyAssetUsdRate)

  const priceImpactPercentage = useMemo(() => {
    const buyAmountBeforeFeesUsd = bnOrZero(buyAmountBeforeFeesCryptoBaseUnit).times(
      buyAssetUsdRate ?? '0',
    )

    if (!sellAmountBeforeFeesUsd || buyAmountBeforeFeesUsd.isZero()) return bn('0')

    const tradeDifference = bn(sellAmountBeforeFeesUsd).minus(buyAmountBeforeFeesUsd)

    return tradeDifference.div(sellAmountBeforeFeesUsd).times(100)
  }, [buyAmountBeforeFeesCryptoBaseUnit, buyAssetUsdRate, sellAmountBeforeFeesUsd])

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
