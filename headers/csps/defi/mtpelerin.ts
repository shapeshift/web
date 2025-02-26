import { loadEnv } from 'vite'

import { determineMode } from '../../../utils'
import type { Csp } from '../../types'

const mode = determineMode()
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    env.VITE_MTPELERIN_ASSETS_API!,
    env.VITE_MTPELERIN_BUY_URL!,
    env.VITE_MTPELERIN_SELL_URL!,
  ],
}
