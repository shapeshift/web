import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  gnosisChainId,
  katanaChainId,
  modeChainId,
  monadChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  solanaChainId,
  suiChainId,
  tronChainId,
} from '@shapeshiftoss/caip'

export const ZERION_CHAINS = [
  // shapeshift supported
  'avalanche',
  'binance-smart-chain',
  'ethereum',
  'optimism',
  'polygon',
  'arbitrum',
  'xdai',
  'base',
  'solana',
  'tron',
  'monad',
  'sui',
  'plasma',
  'katana',
  'mode',
  // not yet
  // 'aurora',
  // 'fantom',
] as const

export type ZerionChainId = (typeof ZERION_CHAINS)[number]

export const ZERION_CHAINS_MAP: Record<ZerionChainId, ChainId> = {
  avalanche: avalancheChainId,
  'binance-smart-chain': bscChainId,
  ethereum: ethChainId,
  optimism: optimismChainId,
  polygon: polygonChainId,
  arbitrum: arbitrumChainId,
  xdai: gnosisChainId,
  base: baseChainId,
  solana: solanaChainId,
  tron: tronChainId,
  monad: monadChainId,
  sui: suiChainId,
  plasma: plasmaChainId,
  katana: katanaChainId,
  mode: modeChainId,
}

export const zerionChainIdToChainId = (chainId: ZerionChainId): ChainId | undefined =>
  ZERION_CHAINS_MAP[chainId]
