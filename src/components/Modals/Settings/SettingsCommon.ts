import { CurrencyFormat } from 'constants/constants'

export enum SettingsRoutes {
  Index = '/settings/index',
  Languages = '/settings/languages',
  FiatCurrencies = '/settings/fiat-currencies',
  CurrencyFormat = '/settings/currency-format',
}

export const currencyFormatsRepresenter: Record<CurrencyFormat, string> = {
  [CurrencyFormat.SystemDefault]: 'modals.settings.systemDefault',
  [CurrencyFormat.DotDecimal]: '1,234.56',
  [CurrencyFormat.CommaDecimal]: '1 234,56',
  [CurrencyFormat.CommaDecimalDotT]: '1.234,56',
  [CurrencyFormat.DotDecimalQuoteT]: "1'234.56",
}
