import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  btcChainId,
  ethChainId,
  fromChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
  solanaChainId,
} from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import type { SupportedChainIds } from '../../types'

export const relayChainMap: Record<ChainId, number> = {
  [btcChainId]: 8253038,
  [ethChainId]: Number(fromChainId(ethChainId).chainReference),
  [arbitrumChainId]: Number(fromChainId(arbitrumChainId).chainReference),
  [baseChainId]: Number(fromChainId(baseChainId).chainReference),
  [optimismChainId]: Number(fromChainId(optimismChainId).chainReference),
  [polygonChainId]: Number(fromChainId(polygonChainId).chainReference),
  [solanaChainId]: 792703809,
  [gnosisChainId]: Number(fromChainId(gnosisChainId).chainReference),
  [avalancheChainId]: Number(fromChainId(avalancheChainId).chainReference),
}

export const DEFAULT_RELAY_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'

export const relaySupportedChainIds: ChainId[] = [
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

export const RELAY_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: relaySupportedChainIds,
  buy: relaySupportedChainIds,
}
