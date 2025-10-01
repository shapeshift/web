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
import { invert } from 'lodash'

export enum SupportedPortalsNetwork {
  Avalanche = 'avalanche',
  BinanceSmartChain = 'bsc',
  Ethereum = 'ethereum',
  Optimism = 'optimism',
  Polygon = 'polygon',
  Gnosis = 'gnosis',
  Arbitrum = 'arbitrum',
  Base = 'base',
}

const PORTALS_NETWORKS_TO_CHAIN_ID_MAP: Record<SupportedPortalsNetwork, ChainId> = {
  [SupportedPortalsNetwork.Avalanche]: avalancheChainId,
  [SupportedPortalsNetwork.BinanceSmartChain]: bscChainId,
  [SupportedPortalsNetwork.Ethereum]: ethChainId,
  [SupportedPortalsNetwork.Optimism]: optimismChainId,
  [SupportedPortalsNetwork.Polygon]: polygonChainId,
  [SupportedPortalsNetwork.Gnosis]: gnosisChainId,
  [SupportedPortalsNetwork.Arbitrum]: arbitrumChainId,
  [SupportedPortalsNetwork.Base]: baseChainId,
} as const

const CHAIN_ID_TO_PORTALS_NETWORK_MAP = invert(PORTALS_NETWORKS_TO_CHAIN_ID_MAP) as Partial<
  Record<ChainId, SupportedPortalsNetwork>
>

export const portalsNetworkToChainId = (network: SupportedPortalsNetwork): ChainId | undefined =>
  PORTALS_NETWORKS_TO_CHAIN_ID_MAP[network]

export const chainIdToPortalsNetwork = (chainId: ChainId): SupportedPortalsNetwork | undefined =>
  CHAIN_ID_TO_PORTALS_NETWORK_MAP[chainId]
