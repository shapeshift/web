import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  btcChainId,
  ethChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
  solanaChainId,
} from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import invert from 'lodash/invert'
import { zeroAddress } from 'viem'
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  gnosis,
  mainnet as ethereum,
  optimism,
  polygon,
} from 'viem/chains'

import type { SupportedChainIds } from '../../types'

export const relaySupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BaseMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.GnosisMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.BitcoinMainnet,
  KnownChainIds.SolanaMainnet,
  KnownChainIds.BnbSmartChainMainnet,
]

export const chainIdToRelayChainId = {
  // https://docs.relay.link/resources/supported-chains
  [btcChainId]: 8253038,
  [ethChainId]: ethereum.id,
  [arbitrumChainId]: arbitrum.id,
  [baseChainId]: base.id,
  [optimismChainId]: optimism.id,
  [polygonChainId]: polygon.id,
  // https://docs.relay.link/resources/supported-chains
  [solanaChainId]: 792703809,
  [gnosisChainId]: gnosis.id,
  [avalancheChainId]: avalanche.id,
  [bscChainId]: bsc.id,
}

export const relayChainIdToChainId = invert(chainIdToRelayChainId)

export const DEFAULT_RELAY_EVM_TOKEN_ADDRESS = zeroAddress
export const RELAY_BTC_TOKEN_ADDRESS = 'bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8'

export const DEFAULT_RELAY_EVM_USER_ADDRESS = '0x000000000000000000000000000000000000dead'
export const DEFAULT_RELAY_BTC_USER_ADDRESS = 'bc1q4vxn43l44h30nkluqfxd9eckf45vr2awz38lwa'

export const RELAY_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: relaySupportedChainIds,
  buy: relaySupportedChainIds,
}

export const MAXIMUM_SUPPORTED_RELAY_STEPS = 2
