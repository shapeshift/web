import type { ChainId } from '@shapeshiftoss/caip'
import { avalancheChainId, bscChainId, ethChainId, optimismChainId } from '@shapeshiftoss/caip'

export const ZERION_CHAINS = [
  // shapeshift supported
  'avalanche',
  'binance-smart-chain',
  'ethereum',
  'optimism',
  // not yet
  // 'arbitrum',
  // 'aurora',
  // 'fantom',
  // 'polygon',
  // 'solana',
  // 'xdai',
] as const

export type ZerionChainId = typeof ZERION_CHAINS[number]

export const ZERION_CHAINS_MAP: Record<ZerionChainId, ChainId> = {
  avalanche: avalancheChainId,
  'binance-smart-chain': bscChainId,
  ethereum: ethChainId,
  optimism: optimismChainId,
}

export const zerionChainIdToChainId = (chainId: ZerionChainId): ChainId | undefined =>
  ZERION_CHAINS_MAP[chainId]
