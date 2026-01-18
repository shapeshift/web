import type { Csp } from '../types'

export const csp: Csp = {
  'connect-src': [
    'https://api.hyperliquid.xyz',
    'wss://api.hyperliquid.xyz',
    'https://api.hyperliquid-testnet.xyz',
    'wss://api.hyperliquid-testnet.xyz',
  ],
}
