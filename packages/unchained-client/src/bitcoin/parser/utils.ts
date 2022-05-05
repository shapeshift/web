import { NetworkTypes } from '@shapeshiftoss/types'

import { Network } from '../types'

export const toNetworkType = (network: Network): NetworkTypes => {
  switch (network) {
    case 'mainnet':
      return NetworkTypes.MAINNET
    case 'testnet':
      return NetworkTypes.TESTNET
    default:
      throw new Error('unsupported network')
  }
}
