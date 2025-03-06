import type { Csp } from '../types'

// Ledger hw-app-eth's needs to connect to Ledger CDN for signing. This is sad, but required.
export const csp: Csp = {
  // https://github.com/LedgerHQ/ledger-live/blob/e7129059b4d86378da55c0c8745219da88877e14/libs/ledgerjs/packages/hw-app-eth/src/services/ledger/index.ts#L53
  'connect-src': [
    'https://cdn.live.ledger.com/cryptoassets/evm/100/erc20-signatures.json',
    'https://cdn.live.ledger.com/plugins/ethereum.json',
  ],
}
