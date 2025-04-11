import type { ChainId } from '@shapeshiftoss/caip'
import { btcChainId } from '@shapeshiftoss/caip'

import { DEFAULT_RELAY_BTC_USER_ADDRESS, DEFAULT_RELAY_EVM_USER_ADDRESS } from '../constant'

export const getRelayDefaultUserAddress = (chainId: ChainId) => {
  if (chainId === btcChainId) return DEFAULT_RELAY_BTC_USER_ADDRESS
  return DEFAULT_RELAY_EVM_USER_ADDRESS
}
