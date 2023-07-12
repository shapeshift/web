import type { SupportedFiatCurrencies } from 'lib/market-service'
import type { CurrencyFormats } from 'state/slices/preferencesSlice/preferencesSlice'

export enum SettingsRoutes {
  Index = '/settings/index',
  Languages = '/settings/languages',
  FiatCurrencies = '/settings/fiat-currencies',
  CurrencyFormat = '/settings/currency-format',
}

export const currencyFormatsRepresenter = (
  format: CurrencyFormats,
  currencySymbol: SupportedFiatCurrencies,
  value: number = 123456.78,
): string => {
  return new Intl.NumberFormat(format, { style: 'currency', currency: currencySymbol }).format(
    value,
  )
}
