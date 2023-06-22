import { CurrencyFormats } from 'constants/CurrencyFormatsEnum'

export enum SettingsRoutes {
  Index = '/settings/index',
  Languages = '/settings/languages',
  FiatCurrencies = '/settings/fiat-currencies',
  CurrencyFormat = '/settings/currency-format',
}

export const currencyFormatsRepresenter: Record<CurrencyFormats, string> = {
  [CurrencyFormats.SystemDefault]: 'modals.settings.systemDefault',
  [CurrencyFormats.DotDecimal]: '1,234.56',
  [CurrencyFormats.CommaDecimal]: '1 234,56',
  [CurrencyFormats.CommaDecimalDotT]: '1.234,56',
  [CurrencyFormats.DotDecimalQuoteT]: "1'234.56",
}
