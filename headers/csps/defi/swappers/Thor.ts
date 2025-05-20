import { loadEnv } from 'vite'

import type { Csp } from '../../../types'

const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  // removes `/v2` from midgard url
  'connect-src': [String(env.VITE_THORCHAIN_MIDGARD_URL).slice(0, -3)],
}
