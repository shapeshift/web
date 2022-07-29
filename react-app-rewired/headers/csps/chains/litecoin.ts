import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_UNCHAINED_LITECOIN_HTTP_URL!,
    process.env.REACT_APP_UNCHAINED_LITECOIN_WS_URL!,
  ],
}
