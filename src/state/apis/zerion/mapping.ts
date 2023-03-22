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

export const zerionAssets = [
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984-ethereum-asset',
  '0x3155ba85d5f96b2d030a4966af206230e46849cb-ethereum-asset',
  '0x4fabb145d64652a948d72533023f6e7a623c7c53-ethereum-asset',
  '0x514910771af9ca656af840dff83e8264ecf986ca-ethereum-asset',
  '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2-ethereum-asset',
  '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce-ethereum-asset',
  '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b-ethereum-asset',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48-ethereum-asset',
  '0xa47c8bf37f92abed4a126bda807a7b7498661acd-ethereum-asset',
  '0xc770eefad204b5180df6a14ee197d99d808ee52d-ethereum-asset',
  '0xd26114cd6ee289accf82350c8d8487fedb8a0c07-ethereum-asset',
  '0xdac17f958d2ee523a2206206994597c13d831ec7-ethereum-asset',
  'avax-avalanche-asset',
  'eth-ethereum-asset',
  'eth-optimism-asset',
]
