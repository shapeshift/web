import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_GATEFI_ASSETS_URL!,
    process.env.REACT_APP_GATEFI_API_BUY_URL!,
  ],
}
