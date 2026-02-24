import { loadEnv } from 'vite'

import type { Csp } from '../../types'
import { FALLBACK_RPC_URLS } from './fallbackRpcUrls'

const envMode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(envMode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [env.VITE_MODE_NODE_URL, 'https://modescan.io', ...FALLBACK_RPC_URLS.mode],
}
