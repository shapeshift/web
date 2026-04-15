import { loadEnv } from 'vite'

import { PUBLIC_RPC_URLS } from '../../../packages/contracts/src/publicRpcUrls'
import type { Csp } from '../../types'

const envMode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(envMode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [env.VITE_MODE_NODE_URL, 'https://modescan.io', ...PUBLIC_RPC_URLS.mode],
}
