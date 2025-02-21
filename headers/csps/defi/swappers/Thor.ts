import { loadEnv } from 'vite'

import type { Csp } from '../../../types'

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '')

export const csp: Csp = {
  // removes `/v2` from midgard url
  'connect-src': [String(env.VITE_MIDGARD_URL).slice(0, -3)],
}
