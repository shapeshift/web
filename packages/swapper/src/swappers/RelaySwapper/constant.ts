import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  btcChainId,
  ethChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
  solanaChainId,
} from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { zeroAddress } from 'viem'
import {
  arbitrum,
  avalanche,
  base,
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
]

export const relayChainMap: Record<ChainId, number> = {
  [btcChainId]: 8253038,
  [ethChainId]: ethereum.id,
  [arbitrumChainId]: arbitrum.id,
  [baseChainId]: base.id,
  [optimismChainId]: optimism.id,
  [polygonChainId]: polygon.id,
  [solanaChainId]: 792703809,
  [gnosisChainId]: gnosis.id,
  [avalancheChainId]: avalanche.id,
}

export const DEFAULT_RELAY_EVM_TOKEN_ADDRESS = zeroAddress
export const DEFAULT_RELAY_EVM_USER_ADDRESS = '0x000000000000000000000000000000000000dead'

export const RELAY_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: relaySupportedChainIds,
  buy: relaySupportedChainIds,
}
