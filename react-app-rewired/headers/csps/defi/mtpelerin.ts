import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_MTPELERIN_ASSETS_API!,
    process.env.REACT_APP_MTPELERIN_BUY_URL!,
    process.env.REACT_APP_MTPELERIN_SELL_URL!,
  ],
}
