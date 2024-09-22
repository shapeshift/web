import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  arbitrumNovaChainId,
  avalancheChainId,
  baseChainId,
  bchChainId,
  bscChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  gnosisChainId,
  ltcChainId,
  optimismChainId,
  polygonChainId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import invert from 'lodash/invert'

export const CHAIN_ID_TO_COINGECKO_PLATFORM_ID: Partial<Record<ChainId, string | null>> = {
  // TODO(gomes): add another mapping to handle native assets without platform id
  [btcChainId]: null,
  [bchChainId]: null,
  [dogeChainId]: null,
  [ltcChainId]: null,
  [ethChainId]: 'ethereum',
  [avalancheChainId]: 'avalanche',
  [optimismChainId]: 'optimistic-ethereum',
  [bscChainId]: 'binance-smart-chain',
  [polygonChainId]: 'polygon-pos',
  [gnosisChainId]: 'xdai',
  [arbitrumChainId]: 'arbitrum-one',
  [arbitrumNovaChainId]: 'arbitrum-nova',
  [baseChainId]: 'base',
  [cosmosChainId]: 'cosmos',
  [thorchainChainId]: 'thorchain',
}

export const COINGECKO_PLATFORM_ID_TO_CHAIN_ID: Partial<Record<string, ChainId | null>> = invert(
  CHAIN_ID_TO_COINGECKO_PLATFORM_ID,
)
