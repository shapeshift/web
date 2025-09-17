import type { CommonFiatCurrencies } from '@/components/Modals/FiatRamps/config'

/**
 * Get the flag URL for a fiat currency
 * @param fiat - The fiat currency enum value
 * @param size - The size of the flag (20, 40, or 80 pixels)
 * @returns The flag URL or null if not available
 */
export const getFiatFlagUrl = (fiat: CommonFiatCurrencies): string | undefined => {
  const countryCode = fiat.toLowerCase()

  if (!countryCode) {
    return
  }

  return `/images/fiat-flags/${countryCode}_40px.png`
}
