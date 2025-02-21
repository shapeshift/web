import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    env.VITE_MTPELERIN_ASSETS_API!,
    env.VITE_MTPELERIN_BUY_URL!,
    env.VITE_MTPELERIN_SELL_URL!,
  ],
}
