export enum DrawerWalletRoutes {
  Main = '/drawer/main',
  Settings = '/drawer/settings',
  SettingsLanguages = '/drawer/settings/languages',
  SettingsFiatCurrencies = '/drawer/settings/fiat-currencies',
  SettingsCurrencyFormat = '/drawer/settings/currency-format',
  SettingsClearCache = '/drawer/settings/clear-cache',
}

export enum DrawerSettingsRoutes {
  Index = '/settings/index',
  Languages = '/settings/languages',
  FiatCurrencies = '/settings/fiat-currencies',
  CurrencyFormat = '/settings/currency-format',
  ClearCache = '/settings/clear-cache',
}

export const drawerSettingsEntries = Object.values(DrawerSettingsRoutes)
