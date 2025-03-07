import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    'https://app.safe.global',
    'https://safe-transaction-mainnet.safe.global',
    'https://safe-transaction-avalanche.safe.global',
    'https://safe-transaction-optimism.safe.global',
    'https://safe-transaction-bsc.safe.global',
    'https://safe-transaction-polygon.safe.global',
    'https://safe-transaction-gnosis-chain.safe.global',
    'https://safe-transaction-arbitrum.safe.global',
    'https://safe-transaction-base.safe.global',
  ],
}
