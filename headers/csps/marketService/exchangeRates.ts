import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    // lib/market-service/src/exchange-rates-host/exchange-rates-host.ts
    'https://api.exchangerate.host/',
  ],
}
