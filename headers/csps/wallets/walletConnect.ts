import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    env.VITE_WALLET_CONNECT_RELAY_URL,
    'wss://*.bridge.walletconnect.org/',
    'wss://*.relay.walletconnect.org/',
    'wss://relay.walletconnect.org/',
    'https://registry.walletconnect.com/api/v2/wallets',
    'https://api.etherscan.io',
    'https://verify.walletconnect.com/',
    'https://verify.walletconnect.org/',
    'https://explorer-api.walletconnect.com/',
    'https://rpc.walletconnect.com/v1/',
    'https://pulse.walletconnect.org/',
    'https://api.web3modal.org/',
  ],
  'img-src': ['https://imagedelivery.net/', 'https://registry.walletconnect.com/api/v2/logo/', '*'],
  'frame-src': ['https://verify.walletconnect.com/', 'https://verify.walletconnect.org/'],
  'style-src': [
    // Use by the Reown WC modal
    'https://fonts.googleapis.com/',
  ],
  'font-src': [
    // Use by the Reown WC modal
    'https://fonts.gstatic.com/',
  ],
}
