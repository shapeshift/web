import type { Csp } from '../../../types'

export const csp: Csp = {
  'connect-src': [
    'https://bs-router-v3.chainservice.io',
    'https://bs-app-api.chainservice.io', // ButterSwap history/status API
  ],
}
