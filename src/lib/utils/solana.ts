import type { AssetId, ChainId } from '@shapeshiftmonorepo/caip'
import { ASSET_NAMESPACE, fromAssetId, solanaChainId } from '@shapeshiftmonorepo/caip'
import type { solana } from '@shapeshiftmonorepo/chain-adapters'
import type { KnownChainIds } from '@shapeshiftmonorepo/types'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const isSolanaChainAdapter = (
  chainAdapter: unknown,
): chainAdapter is solana.ChainAdapter => {
  return (chainAdapter as solana.ChainAdapter).getChainId() === solanaChainId
}

export const assertGetSolanaChainAdapter = (
  chainId: ChainId | KnownChainIds,
): solana.ChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isSolanaChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}

export const isSplToken = (assetId: AssetId): boolean => {
  return fromAssetId(assetId).assetNamespace === ASSET_NAMESPACE.splToken
}
