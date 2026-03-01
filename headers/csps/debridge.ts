import { loadEnv } from 'vite'

import type { Csp } from '../types'

const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    env.VITE_DEBRIDGE_API_URL ? `${env.VITE_DEBRIDGE_API_URL}/` : 'https://dln.debridge.finance/',
    'https://stats-api.dln.trade/',
  ],
}
