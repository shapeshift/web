import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  berachainChainId,
  bscChainId,
  ethChainId,
  gnosisChainId,
  inkChainId,
  katanaChainId,
  lineaChainId,
  monadChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  solanaChainId,
  sonicChainId,
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
  'linea',
  'berachain',
  'ink',
  'sonic',
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
  linea: lineaChainId,
  berachain: berachainChainId,
  ink: inkChainId,
  sonic: sonicChainId,
}

export const zerionChainIdToChainId = (chainId: ZerionChainId): ChainId | undefined =>
  ZERION_CHAINS_MAP[chainId]
