import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import invert from 'lodash/invert'

import { YieldNetwork } from './types'

export const CHAIN_ID_TO_YIELD_NETWORK: Partial<Record<ChainId, YieldNetwork>> = {
  [ethChainId]: YieldNetwork.Ethereum,
  [arbitrumChainId]: YieldNetwork.Arbitrum,
  [baseChainId]: YieldNetwork.Base,
  [optimismChainId]: YieldNetwork.Optimism,
  [polygonChainId]: YieldNetwork.Polygon,
  [bscChainId]: YieldNetwork.Binance,
  [avalancheChainId]: YieldNetwork.AvalancheC,
  [gnosisChainId]: YieldNetwork.Gnosis,
}

export const YIELD_NETWORK_TO_CHAIN_ID: Partial<Record<YieldNetwork, ChainId>> = invert(
  CHAIN_ID_TO_YIELD_NETWORK,
) as Partial<Record<YieldNetwork, ChainId>>

export const SUPPORTED_YIELD_NETWORKS = Object.values(CHAIN_ID_TO_YIELD_NETWORK)

export const isSupportedYieldNetwork = (network: string): network is YieldNetwork =>
  Object.values(CHAIN_ID_TO_YIELD_NETWORK).includes(network as YieldNetwork)
