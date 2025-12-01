import type { ChainId } from '@shapeshiftoss/caip'
import { btcChainId, solanaChainId, tronChainId } from '@shapeshiftoss/caip'

import {
  DEFAULT_RELAY_BTC_USER_ADDRESS,
  DEFAULT_RELAY_EVM_USER_ADDRESS,
  DEFAULT_RELAY_SOLANA_USER_ADDRESS,
  DEFAULT_RELAY_TRON_USER_ADDRESS,
} from '../constant'

export const getRelayDefaultUserAddress = (chainId: ChainId) => {
  switch (chainId) {
    case btcChainId:
      return DEFAULT_RELAY_BTC_USER_ADDRESS
    case solanaChainId:
      return DEFAULT_RELAY_SOLANA_USER_ADDRESS
    case tronChainId:
      return DEFAULT_RELAY_TRON_USER_ADDRESS
    default:
      return DEFAULT_RELAY_EVM_USER_ADDRESS
  }
}
