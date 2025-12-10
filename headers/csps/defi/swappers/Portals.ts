import type { Csp } from '../../../types'

export const csp: Csp = {
  'connect-src': [
    'https://api.portals.fi/v2/',
    'https://api.axelarscan.io', // Axelar bridge status tracking for cross-chain swaps
    'https://v2.api.squidrouter.com', // Squid Router status tracking for non-GMP cross-chain swaps
  ],
}
