import { loadEnv } from 'vite'

import { PUBLIC_RPC_URLS } from '../../../packages/contracts/src/publicRpcUrls'
import type { Csp } from '../../types'

const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [env.VITE_SCROLL_NODE_URL, ...PUBLIC_RPC_URLS.scroll],
}
