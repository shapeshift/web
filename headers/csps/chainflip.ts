import { loadEnv } from 'vite'

import type { Csp } from '../types'

const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(mode, process.cwd(), '')

const rpcOrigin = env.VITE_CHAINFLIP_RPC_URL
  ? new URL(env.VITE_CHAINFLIP_RPC_URL).origin
  : 'https://rpc.mainnet.chainflip.io'

export const csp: Csp = {
  'connect-src': [
    'https://explorer-service-processor.chainflip.io/graphql',
    'https://chainflip-broker.io/',
    rpcOrigin,
    rpcOrigin.replace('https://', 'wss://'),
  ],
}
