import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_WALLET_CONNECT_RELAY_URL!,
    'wss://*.bridge.walletconnect.org/',
    'wss://*.relay.walletconnect.org/',
    'wss://relay.walletconnect.org/',
    'https://registry.walletconnect.com/api/v2/wallets',
    'https://api.etherscan.io',
    'https://verify.walletconnect.com/',
    'https://verify.walletconnect.org/',
    'https://explorer-api.walletconnect.com/',
    'https://rpc.walletconnect.com/v1/',
  ],
  'img-src': ['https://imagedelivery.net/', 'https://registry.walletconnect.com/api/v2/logo/', '*'],
  'frame-src': ['https://verify.walletconnect.com/', 'https://verify.walletconnect.org/'],
}
