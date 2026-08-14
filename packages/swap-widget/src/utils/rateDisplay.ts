import { bnOrZero } from '@shapeshiftoss/utils'

import type { TradeRate } from '../types'

// Every exact-output route buys the same amount, so the sell side is what tells them apart
export const getRateAmountBaseUnit = (rate: TradeRate, isExactOutput: boolean): string =>
  (isExactOutput ? rate.sellAmountCryptoBaseUnit : rate.buyAmountCryptoBaseUnit) ?? '0'

export const sortRatesByValue = (rates: TradeRate[], isExactOutput: boolean): TradeRate[] =>
  [...rates]
    .filter(rate => !rate.error && getRateAmountBaseUnit(rate, isExactOutput) !== '0')
    .sort((a, b) => {
      const aAmount = bnOrZero(getRateAmountBaseUnit(a, isExactOutput))
      const bAmount = bnOrZero(getRateAmountBaseUnit(b, isExactOutput))

      // Cheapest input wins on exact output, largest output wins otherwise
      return isExactOutput ? aAmount.minus(bAmount).toNumber() : bAmount.minus(aAmount).toNumber()
    })

// How much worse than the best route this one is - costing more, or delivering less
export const getRateDiffPercent = (
  bestAmountBaseUnit: string,
  amountBaseUnit: string,
  isExactOutput: boolean,
): string | null => {
  const best = bnOrZero(bestAmountBaseUnit)
  const current = bnOrZero(amountBaseUnit)
  if (best.isZero()) return null

  const diff = isExactOutput
    ? current.minus(best).div(best).times(100)
    : best.minus(current).div(best).times(100)

  // Matches the two decimals below, so anything the format can express gets shown
  return diff.gte('0.01') ? diff.toFixed(2) : null
}
