import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  cosmosChainId,
  ethChainId,
  gnosisChainId,
  hyperEvmChainId,
  monadChainId,
  nearChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  solanaChainId,
  suiChainId,
  tronChainId,
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
  [cosmosChainId]: YieldNetwork.Cosmos,
  [solanaChainId]: YieldNetwork.Solana,
  [suiChainId]: YieldNetwork.Sui,
  [monadChainId]: YieldNetwork.Monad,
  [tronChainId]: YieldNetwork.Tron,
  [hyperEvmChainId]: YieldNetwork.Hyperevm,
  [nearChainId]: YieldNetwork.Near,
  [plasmaChainId]: YieldNetwork.Plasma,
}

export const YIELD_NETWORK_TO_CHAIN_ID: Partial<Record<YieldNetwork, ChainId>> = invert(
  CHAIN_ID_TO_YIELD_NETWORK,
) as Partial<Record<YieldNetwork, ChainId>>

export const SUPPORTED_YIELD_NETWORKS = Object.values(CHAIN_ID_TO_YIELD_NETWORK)

export const isSupportedYieldNetwork = (network: string): network is YieldNetwork =>
  Object.values(CHAIN_ID_TO_YIELD_NETWORK).includes(network as YieldNetwork)

export const SUI_GAS_BUFFER = '0.1'

export const YIELD_POLL_INTERVAL_MS = 5000
export const YIELD_MAX_POLL_ATTEMPTS = 120

export const SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS =
  'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf'

export const SHAPESHIFT_VALIDATOR_LOGO =
  'https://raw.githubusercontent.com/cosmostation/chainlist/main/chain/cosmos/moniker/cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf.png'

export const COSMOS_SHAPESHIFT_FALLBACK_APR = '0.1425'

export const COSMOS_DECIMALS = 6

export const DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID: Partial<Record<ChainId, string>> = {
  [cosmosChainId]: SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
}
