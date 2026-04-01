import { loadEnv } from 'vite'

import { FALLBACK_RPC_URLS } from '../../../packages/contracts/src/fallbackRpcUrls'
import type { Csp } from '../../types'

const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [env.VITE_HEMI_NODE_URL, ...FALLBACK_RPC_URLS.hemi],
}
