import type { Csp } from '../types'

export const csp: Csp = {
  'connect-src': [
    // Common metadata sources
    'https://arweave.net/',
    'https://*.arweave.net/',
  ],
}
