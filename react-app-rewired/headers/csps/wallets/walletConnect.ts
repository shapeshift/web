import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_WALLET_CONNECT_RELAY_URL!,
    'wss://*.bridge.walletconnect.org/',
    'https://verify.walletconnect.com/',
    'https://registry.walletconnect.com/api/v2/wallets',
    'https://api.etherscan.io',
  ],
  'img-src': ['https://imagedelivery.net/', 'https://registry.walletconnect.com/api/v2/logo/', '*'],
}
