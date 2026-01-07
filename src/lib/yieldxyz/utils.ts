import type { ChainId } from '@shapeshiftoss/caip'

import {
  CHAIN_ID_TO_YIELD_NETWORK,
  isSupportedYieldNetwork,
  YIELD_NETWORK_TO_CHAIN_ID,
} from './constants'
import { YieldDto, YieldNetwork } from './types'

export const chainIdToYieldNetwork = (chainId: ChainId): YieldNetwork | undefined =>
  CHAIN_ID_TO_YIELD_NETWORK[chainId]

export const yieldNetworkToChainId = (network: string): ChainId | undefined => {
  if (!isSupportedYieldNetwork(network)) return undefined
  return YIELD_NETWORK_TO_CHAIN_ID[network]
}

export const assertYieldNetworkToChainId = (network: string): ChainId => {
  const chainId = yieldNetworkToChainId(network)
  if (!chainId) {
    throw new Error(`Yield.xyz network "${network}" is not supported by ShapeShift`)
  }
  return chainId
}

export const assertChainIdToYieldNetwork = (chainId: ChainId): YieldNetwork => {
  const network = chainIdToYieldNetwork(chainId)
  if (!network) {
    throw new Error(`ChainId "${chainId}" is not supported by Yield.xyz integration`)
  }
  return network
}

export const filterSupportedYields = (yields: YieldDto[]): YieldDto[] =>
  yields.filter(y => isSupportedYieldNetwork(y.network))


export const isExitableBalanceType = (type: string): boolean =>
  type === 'active' || type === 'withdrawable'
