import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    // https://github.com/coinbase/coinbase-wallet-sdk/blob/16fe7720c30129debf7ada84f50bdf069539efec/packages/wallet-sdk/src/core/constants.ts#L3
    'wss://www.walletlink.org/rpc',
  ],
}
