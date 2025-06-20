import { bnOrZero } from '@/lib/bignumber/bignumber'

export const ALLOWED_PRICE_IMPACT_PERCENTAGE_LOW = 1 // 1%
export const ALLOWED_PRICE_IMPACT_PERCENTAGE_MEDIUM = 5 // 5%
export const ALLOWED_PRICE_IMPACT_PERCENTAGE_HIGH = 15 // 10%

const IMPACT_TIERS = [
  ALLOWED_PRICE_IMPACT_PERCENTAGE_HIGH,
  ALLOWED_PRICE_IMPACT_PERCENTAGE_MEDIUM,
  ALLOWED_PRICE_IMPACT_PERCENTAGE_LOW,
]

type WarningSeverity = 0 | 1 | 2

const getWarningSeverity = (priceImpactPercentage: string | undefined): WarningSeverity => {
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

export const getPriceImpactColor = (priceImpactPercentage: string) => {
  if (bnOrZero(priceImpactPercentage).lte(0)) return 'text.success'

  const severity = getWarningSeverity(priceImpactPercentage)

  if (severity < 1) return 'text.subtle'
  if (severity < 2) return 'text.warning'

  return 'text.error'
}
