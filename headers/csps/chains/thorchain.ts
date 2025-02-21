import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    env.VITE_UNCHAINED_THORCHAIN_HTTP_URL!,
    env.VITE_UNCHAINED_THORCHAIN_WS_URL!,
    env.VITE_UNCHAINED_THORCHAIN_V1_HTTP_URL!,
    env.VITE_THORCHAIN_NODE_URL!,
  ],
}
