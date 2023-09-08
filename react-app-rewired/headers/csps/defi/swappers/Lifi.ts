import type { Csp } from '../../../types'

export const csp: Csp = {
  'connect-src': [
    // src/lib/swapper/LifiSwapper/LifiSwapper.ts
    'https://li.quest',
    'https://mainnet.infura.io',
    'https://api.avax.network',
  ],
}
