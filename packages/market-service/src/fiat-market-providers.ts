import { ExchangeRateHostService } from './exchange-rates-host/exchange-rates-host'

// Order of this FiatMarketProviders array constitutes the order of providers we will be checking first.
// More reliable providers should be listed first.
export const FiatMarketProviders = [new ExchangeRateHostService()]
