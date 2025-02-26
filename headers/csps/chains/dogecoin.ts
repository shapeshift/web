import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const mode = process.env.NODE_ENV || 'development'
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [env.VITE_UNCHAINED_DOGECOIN_HTTP_URL!, env.VITE_UNCHAINED_DOGECOIN_WS_URL!],
}
