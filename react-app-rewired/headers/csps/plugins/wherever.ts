import type { Csp } from '../../types'

const agentCsp: Csp = {
  'connect-src': [
    'https://wherevernntiw.dataplane.rudderstack.com',
    'https://api.wherever.to',
    'https://backend.epns.io',
    'wss://www.walletlink.org/rpc',
    'https://eth-mainnet.alchemyapi.io'
  ],
  'img-src': [
    'https://images.wherever.to',
    'https://gateway.ipfs.io',
    'https://ik.imagekit.io',
    'https://assets.website-files.com'
  ],
}

export const csp: Csp =
  process.env.REACT_APP_FEATURE_WHEREVER === 'true'
    ?  agentCsp
    : {}
