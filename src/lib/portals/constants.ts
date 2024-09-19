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

export const CHAIN_ID_TO_PORTALS_NETWORK: Partial<Record<ChainId, string>> = {
  [avalancheChainId]: 'avalanche',
  [ethChainId]: 'ethereum',
  [polygonChainId]: 'polygon',
  [bscChainId]: 'bsc',
  [optimismChainId]: 'optimism',
  [arbitrumChainId]: 'arbitrum',
  [gnosisChainId]: 'gnosis',
  [baseChainId]: 'base',
}

export const PORTALS_NETWORK_TO_CHAIN_ID: Partial<Record<string, ChainId>> = invert(
  CHAIN_ID_TO_PORTALS_NETWORK,
)
