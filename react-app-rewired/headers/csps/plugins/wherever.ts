import type { Csp } from '../../types'

// These directives come from the "Full agent functionality and displaying guides
// in production" section of https://support.pendo.io/hc/en-us/articles/360032209131,
// with the addition of https://cdn.pendo.io to the connect-src list so we can apply
// agent fixups.
const agentCsp: Csp = {
  'connect-src': [
    'https://staging-api.wherever.to',
    'https://api.wherever.to',
    'https://backend-staging.epns.io',
    'https://backend.epns.io'
  ],
  'img-src': [
    'https://gateway.ipfs.io',
    'https://ik.imagekit.io'
  ],
}

export const csp: Csp = agentCsp;
  // process.env.REACT_APP_FEATURE_WHEREVER === 'true'
  //   ? agentCsp
  //   : {}
