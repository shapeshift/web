import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_UNCHAINED_DOGECOIN_HTTP_URL!,
    process.env.REACT_APP_UNCHAINED_DOGECOIN_WS_URL!,
  ],
}
