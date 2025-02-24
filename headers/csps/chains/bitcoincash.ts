import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '')

export const csp: Csp = {
  'connect-src': [env.VITE_UNCHAINED_BITCOINCASH_HTTP_URL!, env.VITE_UNCHAINED_BITCOINCASH_WS_URL!],
}
