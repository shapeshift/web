import { useMemo } from 'react'
import { bn } from 'lib/bignumber/bignumber'
import {
  selectBuyAmountBeforeFeesUserCurrency,
  selectSellAmountUserCurrency,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const usePriceImpact = () => {
  const buyAmountBeforeFeesUserCurrency = useAppSelector(selectBuyAmountBeforeFeesUserCurrency)
  const sellAmountBeforeFeesUserCurrency = useAppSelector(selectSellAmountUserCurrency)

  const priceImpactPercentage = useMemo(() => {
    if (!sellAmountBeforeFeesUserCurrency || !buyAmountBeforeFeesUserCurrency) return bn('0')

    const tradeDifference = bn(sellAmountBeforeFeesUserCurrency).minus(
      buyAmountBeforeFeesUserCurrency,
    )

    return tradeDifference.div(sellAmountBeforeFeesUserCurrency).times(100)
  }, [sellAmountBeforeFeesUserCurrency, buyAmountBeforeFeesUserCurrency])

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
