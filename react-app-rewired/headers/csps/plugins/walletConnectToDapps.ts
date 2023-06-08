import type { Csp } from '../../types'

export const csp: Csp = {
  'img-src': ['https://registry.walletconnect.com', 'https://explorer-api.walletconnect.com'],
  'connect-src': [
    'wss://safe-walletconnect.safe.global/', // Explicit whitelist required for this dApp to work
  ],
}
