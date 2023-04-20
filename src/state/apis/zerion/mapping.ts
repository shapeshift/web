import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  avalancheChainId,
  bscChainId,
  ethChainId,
  optimismChainId,
  polygonChainId,
  toAssetId,
} from '@shapeshiftoss/caip'

import type { ZerionImplementation } from './validators/fungible'

export const ZERION_CHAINS = [
  // shapeshift supported
  'avalanche',
  'binance-smart-chain',
  'ethereum',
  'optimism',
  'polygon',
  // not yet
  // 'arbitrum',
  // 'aurora',
  // 'fantom',
  // 'solana',
  // 'xdai',
] as const

export type ZerionChainId = typeof ZERION_CHAINS[number]

export const ZERION_CHAINS_MAP: Record<ZerionChainId, ChainId> = {
  avalanche: avalancheChainId,
  'binance-smart-chain': bscChainId,
  ethereum: ethChainId,
  optimism: optimismChainId,
  polygon: polygonChainId,
}

export const zerionChainIdToChainId = (chainId: ZerionChainId): ChainId | undefined =>
  ZERION_CHAINS_MAP[chainId]

export const zerionImplementationToMaybeAssetId = (
  implementation: ZerionImplementation,
): AssetId | undefined => {
  const { chain_id, address: assetReference } = implementation
  const chainId = zerionChainIdToChainId(chain_id as ZerionChainId)
  if (!chainId) return undefined
  const assetNamespace = (() => {
    switch (true) {
      case chainId === bscChainId:
        return ASSET_NAMESPACE.bep20
      default:
        return ASSET_NAMESPACE.erc20
    }
  })()
  return toAssetId({ chainId, assetNamespace, assetReference })
}
