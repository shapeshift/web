import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  gnosisChainId,
  hyperEvmChainId,
  optimismChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import invert from 'lodash/invert'

export const CHAIN_ID_TO_PORTALS_NETWORK: Partial<Record<ChainId, string>> = {
  [avalancheChainId]: 'avalanche',
  [ethChainId]: 'ethereum',
  [gnosisChainId]: 'gnosis',
  [polygonChainId]: 'polygon',
  [bscChainId]: 'bsc',
  [optimismChainId]: 'optimism',
  [arbitrumChainId]: 'arbitrum',
  [baseChainId]: 'base',
  [hyperEvmChainId]: 'hyperevm',
}

export const PORTALS_NETWORK_TO_CHAIN_ID: Partial<Record<string, ChainId>> = invert(
  CHAIN_ID_TO_PORTALS_NETWORK,
)
