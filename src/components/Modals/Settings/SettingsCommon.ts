import { CurrencyFormats } from 'state/slices/preferencesSlice/preferencesSlice'

export enum SettingsRoutes {
  Index = '/settings/index',
  Languages = '/settings/languages',
  FiatCurrencies = '/settings/fiat-currencies',
  CurrenyFormat = '/settings/currency-format',
}

export const currnecyFormatsRepresenter: Record<CurrencyFormats, string> = {
  [CurrencyFormats.DotDecimal]: '1,234.56',
  [CurrencyFormats.CommaDecimal]: '1.234,56',
}
