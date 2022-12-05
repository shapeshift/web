import type { Csp } from '../../types'

const agentCsp: Csp = {
  'connect-src': [
    'https://api.wherever.to',
    'https://backend.epns.io',
    'https://backend-staging.epns.io',
    'wss://www.walletlink.org/rpc'
  ],
  'img-src': [
    'https://gateway.ipfs.io',
    'https://ik.imagekit.io'
  ],
}

export const csp: Csp =
  process.env.REACT_APP_FEATURE_WHEREVER === 'true'
    ?  agentCsp
    : {}
