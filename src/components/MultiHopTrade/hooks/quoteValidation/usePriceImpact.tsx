import type { TradeQuote, TradeRate } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'

import { getPriceImpactColor } from '../../utils/getPriceImpactColor'
import { useInputOutputDifferenceDecimalPercentage } from '../useInputOutputDifference'

import { BigNumber, bnOrZero } from '@/lib/bignumber/bignumber'

export const usePriceImpact = (tradeQuote: TradeQuote | TradeRate | undefined) => {
  // Avoid using tradeInputSlice selectors here due to inaccurate values during debouncing.
  // Selectors update instantly, but quotes are refreshed post-request completion, leading to
  // discrepancies while fetching.

  const _inputOutputDifferenceDecimalPercentage =
    useInputOutputDifferenceDecimalPercentage(tradeQuote)
  const inputOutputDifferenceDecimalPercentage = useMemo(() => {
    if (!_inputOutputDifferenceDecimalPercentage) return

    return bnOrZero(_inputOutputDifferenceDecimalPercentage).times(100).toFixed()
  }, [_inputOutputDifferenceDecimalPercentage])

  const priceImpactPercentageAbsolute = useMemo(() => {
    if (!inputOutputDifferenceDecimalPercentage) return

    const percentageAbsolute = bnOrZero(inputOutputDifferenceDecimalPercentage)
      ?.abs()
      .toFixed(2, BigNumber.ROUND_DOWN)

    return bnOrZero(percentageAbsolute)
  }, [inputOutputDifferenceDecimalPercentage])

  const priceImpactColor = getPriceImpactColor(bnOrZero(priceImpactPercentageAbsolute).toFixed())

  const result = useMemo(
    () => ({
      priceImpactPercentageAbsolute,
      priceImpactColor,
    }),
    [priceImpactPercentageAbsolute, priceImpactColor],
  )

  return result
}
