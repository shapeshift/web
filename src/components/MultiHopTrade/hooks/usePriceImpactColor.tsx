import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'

const ALLOWED_PRICE_IMPACT_PERCENTAGE_LOW: string = '1' // 1%
const ALLOWED_PRICE_IMPACT_PERCENTAGE_MEDIUM: string = '3' // 3%
const ALLOWED_PRICE_IMPACT_PERCENTAGE_HIGH: string = '5' // 5%
const ALLOWED_PRICE_IMPACT_PERCENTAGE_EXPERT: string = '15' // 15%

const IMPACT_TIERS = [
  ALLOWED_PRICE_IMPACT_PERCENTAGE_EXPERT,
  ALLOWED_PRICE_IMPACT_PERCENTAGE_HIGH,
  ALLOWED_PRICE_IMPACT_PERCENTAGE_MEDIUM,
  ALLOWED_PRICE_IMPACT_PERCENTAGE_LOW,
]

type WarningSeverity = 0 | 1 | 2 | 3 | 4

const warningSeverity = (priceImpactPercentage: string | undefined): WarningSeverity => {
  if (!priceImpactPercentage) return 0
  // This function is used to calculate the Severity level for % changes in USD value and Price Impact.
  // Price Impact is always an absolute value (conceptually always negative, but represented in code with a positive value)
  // The USD value change can be positive or negative, and it follows the same standard as Price Impact (positive value is the typical case of a loss due to slippage).
  // We don't want to return a warning level for a favorable/profitable change, so when the USD value change is negative we return 0.
  // TODO (WEB-1833): Disambiguate Price Impact and USD value change, and flip the sign of USD Value change.
  if (bnOrZero(priceImpactPercentage).isLessThan(0)) return 0
  let impact: WarningSeverity = IMPACT_TIERS.length as WarningSeverity
  for (const impactLevel of IMPACT_TIERS) {
    if (bnOrZero(impactLevel).isLessThan(priceImpactPercentage)) return impact
    impact--
  }
  return 0
}

export const usePriceImpactColor = (priceImpactPercentage?: string) => {
  const priceImpactColor = useMemo(() => {
    if (!priceImpactPercentage) return undefined
    if (bnOrZero(priceImpactPercentage).isLessThan(0)) return 'text.success'
    const severity = warningSeverity(priceImpactPercentage)
    if (severity < 1) return 'text.subtle'
    if (severity < 3) return 'text.warning'
    return 'text.error'
  }, [priceImpactPercentage])

  return priceImpactColor
}
