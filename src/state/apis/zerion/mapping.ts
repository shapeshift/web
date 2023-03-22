import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  avalancheAssetId,
  avalancheChainId,
  bscChainId,
  ethAssetId,
  ethChainId,
  optimismAssetId,
  optimismChainId,
} from '@shapeshiftoss/caip'

import type { ZerionChainId, ZerionFeeAssetId } from './types'

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

export const ZERION_FEE_ASSETS = [
  'avax-avalanche-asset',
  'eth-ethereum-asset',
  'eth-optimism-asset',
] as const

export const ZERION_CHAINS_MAP: Record<ZerionChainId, ChainId> = {
  avalanche: avalancheChainId,
  'binance-smart-chain': bscChainId,
  ethereum: ethChainId,
  optimism: optimismChainId,
}

export const ZERION_FEE_ASSETS_MAP: Record<ZerionFeeAssetId, AssetId> = {
  'avax-avalanche-asset': avalancheAssetId,
  'eth-ethereum-asset': ethAssetId,
  'eth-optimism-asset': optimismAssetId,
}
