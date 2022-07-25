import { CurrencyFormats } from 'state/slices/preferencesSlice/preferencesSlice'

export enum SettingsRoutes {
  Index = '/settings/index',
  Languages = '/settings/languages',
  FiatCurrencies = '/settings/fiat-currencies',
  CurrencyFormat = '/settings/currency-format',
}

export const currencyFormatsRepresenter: Record<CurrencyFormats, string> = {
  [CurrencyFormats.DotDecimal]: '1,234.56',
  [CurrencyFormats.CommaDecimal]: '1 234,56',
}
