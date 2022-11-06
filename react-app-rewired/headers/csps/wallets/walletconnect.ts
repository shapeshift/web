import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    '*',
    'wss://*.bridge.walletconnect.org/',
    'https://registry.walletconnect.com/api/v2/wallets',
    "https://api.etherscan.io"
  ],
  'img-src': ['https://imagedelivery.net/', 'https://registry.walletconnect.com/api/v2/logo/', "*"],
}
