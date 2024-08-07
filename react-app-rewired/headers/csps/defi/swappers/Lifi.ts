import type { Csp } from '../../../types'

export const csp: Csp = {
  'connect-src': [
    // src/lib/swapper/LifiSwapper/LifiSwapper.ts
    'https://li.quest',
    // Move me to a better place if we ever use this PoC and support all EVM chains
    'https://safe-transaction-avalanche.safe.global/api/v1/',
    'https://mainnet.infura.io',
    'https://api.avax.network',
  ],
}
